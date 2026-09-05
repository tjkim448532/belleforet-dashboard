const fs = require('fs');
let code = fs.readFileSync('src/lib/dataTransformers.ts', 'utf8');

const oldKpiMetrics = `  const kpiMetrics = {
    totalOcc: backendOcc > 0 ? backendOcc : (physicalRoomInventory > 0 ? (totalRoomsSold / physicalRoomInventory) * 100 : 0),
    totalADR: backendADR > 0 ? backendADR : (totalRoomsSold > 0 ? (totalRoomRev / totalRoomsSold) : 0),
    revPAR: backendRevPAR > 0 ? backendRevPAR : (physicalRoomInventory > 0 ? (totalRoomRev / physicalRoomInventory) : 0),
    trevPAR: backendTrevPAR > 0 ? backendTrevPAR : (physicalRoomInventory > 0 ? (totalResortRevGross / physicalRoomInventory) : 0),
    days: days,
    raw: {`;

const newKpiMetrics = `  // [SSOT 무결성 원칙 완벽 준수 (Zero-Proxy)] 
  // 백엔드가 데이터를 안 줬다고 프론트엔드가 자체 연산으로 가짜 숫자(Mocking)를 만들어내는 행위 영구 금지
  const kpiMetrics = {
    totalOcc: backendOcc,
    totalADR: backendADR,
    revPAR: backendRevPAR,
    trevPAR: backendTrevPAR,
    days: days,
    raw: {`;

code = code.replace(oldKpiMetrics, newKpiMetrics);
fs.writeFileSync('src/lib/dataTransformers.ts', code);
