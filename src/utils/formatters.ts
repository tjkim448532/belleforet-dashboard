export const formatRevenue = (amount: number): string => {
    // ₩ 기호 없이 순수 숫자만 #,##0 형태로 콤마 처리
    return new Intl.NumberFormat('ko-KR').format(amount);
};
