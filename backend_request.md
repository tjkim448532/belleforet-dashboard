# [백엔드 요청사항 명세서] V6 회원 마트 및 API 개편

본 문서는 프론트엔드 하드코딩 제거 및 무결성 아키텍처 강제를 위한 백엔드 작업 지시서입니다.

## 1. ETL 파이프라인 신설 (`sp_etl_v6_member_marts.sql`)

```sql
-- ==============================================================================
-- [DBA Masterpiece] SP_ETL_V6_MEMBER_MARTS
-- 무결성 보장: 카테시안 곱 차단, Soft-Catchall 격리, True Idempotent YTD Sync
-- ==============================================================================

DELIMITER $$
CREATE PROCEDURE sp_etl_v6_member_marts(IN p_date_id VARCHAR(8))
BEGIN
    -- 1. 마스터 테이블 및 마트 테이블 DDL (형상 관리용, 이미 존재하면 무시)
    CREATE TABLE IF NOT EXISTS dim_membership_mapping_rules (
        rule_id INT AUTO_INCREMENT PRIMARY KEY,
        match_column VARCHAR(50) NOT NULL,
        match_type VARCHAR(20) NOT NULL,
        match_pattern VARCHAR(255) NOT NULL,
        target_category_code VARCHAR(20) NOT NULL,
        priority INT NOT NULL,
        description VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS dim_account_code_master (
        account_code VARCHAR(50) PRIMARY KEY,
        account_name VARCHAR(100),
        is_room_revenue_target TINYINT(1) DEFAULT 0,
        is_golf_revenue_target TINYINT(1) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS log_unmapped_memberships (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        log_date DATE,
        source_table VARCHAR(50),
        unmapped_key VARCHAR(255),
        unmapped_value VARCHAR(255),
        error_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mat_v6_member_visits_daily (
        date DATE NOT NULL,
        member_id VARCHAR(100) NOT NULL,
        member_name VARCHAR(100),
        phone VARCHAR(50),
        membership_category_code VARCHAR(20),
        daily_spend DECIMAL(15,2) DEFAULT 0,
        visited_facilities VARCHAR(255),
        PRIMARY KEY (date, member_id),
        INDEX idx_member (member_id),
        INDEX idx_category (membership_category_code)
    );

    CREATE TABLE IF NOT EXISTS mat_v6_member_profile (
        member_id VARCHAR(100) PRIMARY KEY,
        member_name VARCHAR(100),
        phone VARCHAR(50),
        membership_category_code VARCHAR(20),
        total_visits INT DEFAULT 0,
        ytd_spend DECIMAL(15,2) DEFAULT 0,
        first_visit_this_year DATE,
        last_visit_date DATE,
        INDEX idx_category (membership_category_code)
    );

    -- 2. 대상 일자 변수 설정
    DECLARE v_target_date DATE;
    SET v_target_date = STR_TO_DATE(p_date_id, '%Y%m%d');
    DECLARE v_target_year VARCHAR(4);
    SET v_target_year = SUBSTRING(p_date_id, 1, 4);

    -- 3. 원천 트랜잭션 추출 및 Account Code Soft-Catchall (LEFT JOIN) 적용
    DROP TEMPORARY TABLE IF EXISTS tmp_deduped_transactions;
    CREATE TEMPORARY TABLE tmp_deduped_transactions AS
    -- 골프 내장객 추출
    SELECT 
        p.회원번호 AS member_id,
        p.이름 AS member_name,
        p.회원분류명 AS raw_member_type,
        'GOLF' AS source_facility,
        ROUND(COALESCE(SUM(CAST(REPLACE(j.매출, ',', '') AS DECIMAL(15,2))), 0)) AS spend
    FROM raw_골프_예약_v6 r
    JOIN raw_골프_내장객_v6 p ON r.예약번호_K = p.예약번호_K
    LEFT JOIN raw_골프_정산_v6 j ON p.예약번호_K = j.예약번호 AND p.동반객순번_K = j.동반객순번 AND j.영업일자 = r.영업일자
    WHERE r.예약상태명 NOT IN ('예약취소', '취소', 'NO-SHOW')
      AND r.영업일자 = v_target_date
      AND p.회원번호 IS NOT NULL AND p.회원번호 != '' AND p.회원번호 != '0'
    GROUP BY p.회원번호, p.이름, p.회원분류명
    
    UNION ALL
    
    -- 객실 내장객 추출 (Soft-Catchall LEFT JOIN)
    SELECT 
        COALESCE(NULLIF(r.회원번호, ''), NULLIF(r.회원권번호, ''), NULLIF(r.고객번호, '')) AS member_id,
        COALESCE(NULLIF(r.회원명, ''), r.예약자, r.투숙객명) AS member_name,
        COALESCE(NULLIF(r.회원권명, ''), r.요금타입명) AS raw_member_type,
        'ROOM' AS source_facility,
        ROUND(COALESCE(SUM(CAST(REPLACE(s.매출, ',', '') AS DECIMAL(15,2))), 0)) AS spend
    FROM raw_객실_예약_v6 r
    LEFT JOIN raw_객실_정산_v6 s ON r.예약번호_K = s.예약번호 AND REPLACE(s.영업일자, '-', '') = p_date_id
    LEFT JOIN dim_account_code_master ac ON s.계정코드 = ac.account_code 
    WHERE r.예약상태명 NOT IN ('Cancelled Reservation', 'Cancel', 'No-Show')
      AND r.도착일자 = v_target_date
      AND (
          (r.회원번호 IS NOT NULL AND r.회원번호 != '' AND r.회원번호 != '0')
          OR r.요금타입명 LIKE '%구좌%' OR r.요금타입명 LIKE '%로얄회원%' OR r.요금타입명 LIKE '%창립%'
      )
    GROUP BY member_id, member_name, raw_member_type;

    -- [Quarantine] 매핑되지 않은 계정 코드 적발
    INSERT INTO log_unmapped_memberships (log_date, source_table, unmapped_key, unmapped_value, error_reason)
    SELECT v_target_date, 'raw_객실_정산_v6', s.예약번호, s.계정코드, 'Missing Account Code'
    FROM raw_객실_예약_v6 r
    JOIN raw_객실_정산_v6 s ON r.예약번호_K = s.예약번호 AND REPLACE(s.영업일자, '-', '') = p_date_id
    LEFT JOIN dim_account_code_master ac ON s.계정코드 = ac.account_code
    WHERE ac.account_code IS NULL AND s.매출 > 0;

    -- 4. 다중 시설 교차 이용 병합 (Aggregation)
    DROP TEMPORARY TABLE IF EXISTS tmp_today_visitors;
    CREATE TEMPORARY TABLE tmp_today_visitors AS
    SELECT 
        member_id,
        MAX(member_name) AS member_name,
        MAX(raw_member_type) AS raw_member_type,
        SUM(spend) AS daily_spend,
        GROUP_CONCAT(DISTINCT source_facility SEPARATOR ', ') AS visited_facilities
    FROM tmp_deduped_transactions
    GROUP BY member_id;

    -- 5. Divide and Conquer Rule Matching (Multi-pass)
    DROP TEMPORARY TABLE IF EXISTS tmp_classified_visitors;
    CREATE TEMPORARY TABLE tmp_classified_visitors AS
    SELECT 
        t.*,
        CASE 
            WHEN t.member_id LIKE 'BP1V%' OR t.raw_member_type LIKE '%로얄%' OR t.raw_member_type LIKE '%창립%' THEN 'VIP'
            WHEN t.member_id REGEXP '^[A-Z0-9]+(0[1-9]|[1-9][0-9])$' OR t.raw_member_type LIKE '%준회원%' OR t.raw_member_type LIKE '%지정%' THEN 'DESIGNATED'
            WHEN (t.member_id REGEXP '^[0-9]{8}$' AND SUBSTRING(t.member_id,1,2) IN ('11','12','21','22','31','32') AND t.member_id LIKE '%00') 
                 OR (t.member_id LIKE 'BP%' AND t.raw_member_type LIKE '%구좌%')
                 OR t.raw_member_type LIKE '%구좌%' OR t.raw_member_type LIKE '%분양%' OR t.raw_member_type LIKE '%정회원%' THEN 'ACCOUNT'
            ELSE 'UNCLASSIFIED'
        END AS membership_category_code
    FROM tmp_today_visitors t;

    -- [Quarantine] 분류되지 않은 회원 적발
    INSERT INTO log_unmapped_memberships (log_date, source_table, unmapped_key, unmapped_value, error_reason)
    SELECT v_target_date, 'tmp_classified_visitors', member_id, raw_member_type, 'Unclassified Membership'
    FROM tmp_classified_visitors
    WHERE membership_category_code = 'UNCLASSIFIED';

    -- 6. 일별 스냅샷 마트 적재 (Idempotent 멱등성 보장)
    DELETE FROM mat_v6_member_visits_daily WHERE date = v_target_date;
    
    INSERT INTO mat_v6_member_visits_daily (date, member_id, member_name, membership_category_code, daily_spend, visited_facilities)
    SELECT v_target_date, member_id, member_name, membership_category_code, daily_spend, visited_facilities
    FROM tmp_classified_visitors;

    -- 7. True Idempotent YTD Sync (완전한 멱등성 누적 동기화)
    -- 당해 연도를 동적으로 추출하여 집계 (Dynamic Year Extraction)
    INSERT INTO mat_v6_member_profile (member_id, member_name, membership_category_code, total_visits, ytd_spend, last_visit_date)
    SELECT 
        d.member_id,
        MAX(d.member_name),
        MAX(d.membership_category_code),
        COUNT(DISTINCT d.date) as total_visits,
        SUM(d.daily_spend) as ytd_spend,
        MAX(d.date) as last_visit_date
    FROM mat_v6_member_visits_daily d
    WHERE d.member_id IN (SELECT member_id FROM tmp_classified_visitors)
      AND d.date LIKE CONCAT(v_target_year, '%')
    GROUP BY d.member_id
    ON DUPLICATE KEY UPDATE 
        member_name = VALUES(member_name),
        membership_category_code = VALUES(membership_category_code),
        total_visits = VALUES(total_visits),
        ytd_spend = VALUES(ytd_spend),
        last_visit_date = VALUES(last_visit_date);

END $$
DELIMITER ;
```

## 2. 백엔드 API 간소화 (`route.ts`)
기존의 복잡한 런타임 JOIN 코드를 삭제하고, 위에서 생성된 `mat_v6_member_visits_daily` 와 `mat_v6_member_profile` 테이블을 단순 JOIN 하여 데이터를 서빙하도록 수정 바랍니다.
