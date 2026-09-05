"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ModuleId = "general" | "scientific" | "air" | "belt" | "flat" | "chain" | "bucket" | "screw";
type Lang = "th" | "en";
type NumericFields = Record<string, number>;
type Bi = [th: string, en: string];
type Field = { key: string; label: Bi; unit: string; step?: number; options?: number[] };
interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }
const tr = (text: Bi, lang: Lang) => text[lang === "th" ? 0 : 1];

const modules: Array<{ id: ModuleId; label: Bi; short: Bi; symbol: string }> = [
  { id: "general", label: ["คำนวณทั่วไป", "General Calculators"], short: ["สูตรใช้งานประจำ", "Everyday formulas"], symbol: "+" },
  { id: "scientific", label: ["เครื่องคิดเลข", "Scientific Calculator"], short: ["ตรีโกณและวิศวกรรม", "Trig & engineering"], symbol: "ƒx" },
  { id: "air", label: ["กระบอกลม", "Air Cylinder"], short: ["ระบบนิวเมติก", "Pneumatic"], symbol: "◎" },
  { id: "belt", label: ["สายพานลำเลียง", "Belt Conveyor"], short: ["วัสดุเทกอง", "Bulk handling"], symbol: "⌁" },
  { id: "flat", label: ["สายพานเรียบ", "Flat Belt"], short: ["ลำเลียงกระสอบ", "Bag transport"], symbol: "▱" },
  { id: "chain", label: ["โซ่ลำเลียง", "Chain Conveyor"], short: ["ลำเลียงชิ้นงาน", "Unit handling"], symbol: "◇" },
  { id: "bucket", label: ["บักเก็ตเอลลิเวเตอร์", "Bucket Elevator"], short: ["ลำเลียงแนวดิ่ง", "Vertical lift"], symbol: "↟" },
  { id: "screw", label: ["สกรูลำเลียง", "Screw Conveyor"], short: ["ป้อนวัสดุ", "Metered flow"], symbol: "≈" },
];

const defaults: Record<ModuleId, NumericFields> = {
  general: {},
  scientific: {},
  air: { standard: 15552, bore: 63, rod: 20, flow: 10, pressure: 4 },
  belt: { capacity: 50, density: 2.16, selectedWidth: 500, materialAngle: 35, troughAngle: 35, slopeCoefficient: 0.85, speed: 1.055, carryIdler: 16, returnIdler: 11.4, carryPitch: 1.2, returnPitch: 3, length: 98, coefficient: 1.8, friction: 0.02, gravity: 9.81, efficiency: 0.8 },
  flat: { length: 7000, angle: 30, throughput: 800, bagLength: 1000, gap: 0, bagWeight: 25, pulleyDiameter: 165, friction: 0.05, gearEfficiency: 0.9, startupFactor: 1.5, serviceFactor: 1.2, motorRpm: 1450, driveTeeth: 15, drivenTeeth: 45, gearboxRatio: 18.79 },
  chain: { load: 200, length: 8, speed: 20, friction: 0.21, efficiency: 0.8, movingMass: 4.16, speedFactor: 1, allowance: 5800, sprocketDiameter: 139.9, motorFactor: 1.1, loadFactor: 1.25 },
  bucket: { capacity: 12, density: 0.45, bucketVolume: 0.0101, pitch: 150, speed: 15, height: 45, bucketWeight: 7.7, chainWeight: 6.56, stands: 2, tempFactor: 7, operationFactor: 1.2, averageStrength: 113, efficiency: 0.8 },
  screw: { screwDiameter: 0.08, shaftDiameter: 0.04, pitch: 0.05, rpm: 1.5, filling: 0.8, incline: 1, density: 0.6, length: 1, friction: 4.4, height: 0, efficiency: 0.6, pipeOD: 40, pipeThickness: 20, pipeLength: 1000, elasticModulus: 210000 },
};

const f = (key: string, th: string, en: string, unit: string, step?: number): Field => ({ key, label: [th, en], unit, step });
const standardBeltWidths = [300, 400, 500, 600, 650, 750, 800, 900, 1000, 1050, 1200, 1350, 1400, 1500, 1600, 1800, 2000, 2200, 2400];
const fieldConfig: Record<ModuleId, Field[]> = {
  general: [],
  scientific: [],
  air: [f("flow", "อัตราการไหล", "Air flow", "L/min", .1), f("pressure", "แรงดัน", "Pressure", "bar", .1)],
  belt: [f("capacity", "กำลังลำเลียง", "Capacity", "t/h"), f("density", "ความหนาแน่นวัสดุ", "Material density", "t/m³", .01), { key: "selectedWidth", label: ["ความกว้างสายพานที่เลือก", "Selected belt width"], unit: "mm", options: standardBeltWidths }, f("materialAngle", "มุมกองวัสดุ", "Material angle", "deg"), f("troughAngle", "มุมราง", "Trough angle", "deg"), f("slopeCoefficient", "ตัวคูณความลาด", "Slope coefficient", "k", .01), f("speed", "ความเร็วสายพาน", "Belt speed", "m/s", .001), f("carryIdler", "มวลลูกกลิ้งขาไป", "Carry idler mass", "kg/set", .1), f("returnIdler", "มวลลูกกลิ้งขากลับ", "Return idler mass", "kg/set", .1), f("carryPitch", "พิทช์ลูกกลิ้งขาไป", "Carry idler pitch", "m", .1), f("returnPitch", "พิทช์ลูกกลิ้งขากลับ", "Return idler pitch", "m", .1), f("length", "ความยาวสายพาน", "Conveyor length", "m", .1), f("coefficient", "สัมประสิทธิ์ความต้านทาน", "Resistance coefficient", "C", .1), f("friction", "แรงเสียดทานลูกกลิ้ง", "Idler friction", "f", .001), f("efficiency", "ประสิทธิภาพชุดขับ", "Drive efficiency", "η", .01)],
  flat: [f("length", "ความยาวสายพาน", "Belt length", "mm"), f("angle", "มุมเอียง", "Incline angle", "deg", .1), f("throughput", "อัตราการผลิต", "Production rate", "bags/h"), f("bagLength", "ความยาวกระสอบ", "Bag length", "mm"), f("gap", "ระยะห่างกระสอบ", "Bag spacing", "mm"), f("bagWeight", "น้ำหนักต่อกระสอบ", "Bag weight", "kg", .1), f("pulleyDiameter", "เส้นผ่านศูนย์กลางพูลเลย์", "Pulley diameter", "mm", .1), f("friction", "สัมประสิทธิ์แรงเสียดทาน", "Friction coefficient", "μ", .01), f("motorRpm", "รอบมอเตอร์", "Motor speed", "rpm"), f("gearboxRatio", "อัตราทดเกียร์ที่เลือก", "Selected gearbox ratio", ":1", .01), f("driveTeeth", "จำนวนฟันเฟืองขับ", "Drive sprocket teeth", "T"), f("drivenTeeth", "จำนวนฟันเฟืองตาม", "Driven sprocket teeth", "T"), f("gearEfficiency", "ประสิทธิภาพเกียร์", "Gear efficiency", "η", .01), f("startupFactor", "ตัวคูณตอนสตาร์ท", "Startup factor", "SF", .1), f("serviceFactor", "ตัวคูณการใช้งาน", "Service factor", "SF", .1)],
  chain: [f("load", "น้ำหนักบรรทุก", "Payload", "kg"), f("length", "ระยะศูนย์กลาง", "Center distance", "m", .1), f("speed", "ความเร็วโซ่", "Chain speed", "m/min", .1), f("friction", "แรงเสียดทานกลิ้ง", "Rolling friction", "f", .01), f("movingMass", "มวลส่วนเคลื่อนที่", "Moving mass", "kg/m", .01), f("efficiency", "ประสิทธิภาพชุดขับ", "Drive efficiency", "η", .01), f("allowance", "แรงดึงที่ยอมได้", "Allowable load", "N"), f("sprocketDiameter", "เส้นผ่านศูนย์กลางพิทช์", "Sprocket pitch dia.", "mm", .1), f("loadFactor", "ตัวคูณโหลดเกียร์", "Gear load factor", "SF", .05)],
  bucket: [f("capacity", "กำลังลำเลียงที่ต้องการ", "Required capacity", "t/h", .1), f("density", "ความหนาแน่นวัสดุ", "Material density", "t/m³", .01), f("bucketVolume", "ปริมาตรบุ้งกี๋", "Bucket volume", "m³/pc", .0001), f("pitch", "พิทช์โซ่", "Chain pitch", "mm"), f("speed", "ความเร็วลำเลียง", "Conveying speed", "m/min", .1), f("height", "ความสูงลำเลียง", "Conveying height", "m", .1), f("bucketWeight", "น้ำหนักบุ้งกี๋", "Bucket weight", "kg/pc", .1), f("chainWeight", "น้ำหนักโซ่ต่อเส้น", "Chain / stand", "kg/m", .01), f("stands", "จำนวนเส้นโซ่", "Chain stands", "stand"), f("tempFactor", "ตัวคูณอุณหภูมิ", "Temperature factor", "SF", .1), f("operationFactor", "ตัวคูณการใช้งาน", "Operation factor", "SF", .1), f("averageStrength", "ความแข็งแรงเฉลี่ย", "Average strength", "kN", .1), f("efficiency", "ประสิทธิภาพมอเตอร์", "Motor efficiency", "η", .01)],
  screw: [f("screwDiameter", "เส้นผ่านศูนย์กลางสกรู", "Screw diameter", "m", .01), f("shaftDiameter", "เส้นผ่านศูนย์กลางเพลา", "Shaft diameter", "m", .01), f("pitch", "พิทช์สกรู", "Screw pitch", "m", .01), f("rpm", "รอบสกรู", "Revolution", "rpm", .1), f("filling", "อัตราการเติม", "Filling factor", "φ", .05), f("incline", "ตัวคูณความเอียง", "Incline factor", "K", .05), f("density", "ความหนาแน่นรวม", "Bulk density", "t/m³", .01), f("length", "ความยาวลำเลียง", "Conveyor length", "m", .1), f("friction", "แรงเสียดทานวัสดุ", "Material friction", "f", .1), f("height", "ความสูงลำเลียง", "Conveyor height", "m", .1), f("efficiency", "ประสิทธิภาพชุดขับ", "Drive efficiency", "η", .05)],
};

const finite = (v: number) => Number.isFinite(v) ? v : 0;
const format = (v: number, digits = 2) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: digits }).format(finite(v));
const motorRatings = [.12, .18, .25, .37, .55, .75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90];
const nextMotor = (kw: number) => motorRatings.find((rating) => rating >= kw) ?? Math.ceil(kw / 10) * 10;

function calculate(module: ModuleId, x: NumericFields, lang: Lang) {
  const T = (th: string, en: string) => tr([th, en], lang);
  if (module === "general") return { headline: [T("เครื่องคำนวณทั่วไป", "General calculators"), 14, "tools", 0] as const, metrics: [] as const, formula: "", status: T("พร้อมใช้งาน", "Ready"), healthy: true };
  if (module === "scientific") return { headline: [T("เครื่องคิดเลขวิทยาศาสตร์", "Scientific calculator"), 0, "", 0] as const, metrics: [] as const, formula: "", status: T("พร้อมใช้งาน", "Ready"), healthy: true };
  if (module === "air") {
    const area = Math.PI * (x.bore / 10) ** 2 / 4, rodArea = Math.PI * (x.rod / 10) ** 2 / 4, speed = x.flow * 10000 / (area * 60);
    return { headline: [T("ความเร็วลูกสูบ", "Piston speed"), speed, "mm/s", 1] as const, metrics: [[T("พื้นที่ลูกสูบ", "Piston area"), area, "cm²", 2], [T("ความเร็ว", "Speed"), speed * 60 / 1000, "m/min", 2], [T("แรงดันออก", "Push force"), area * x.pressure * 1.019716213, "kgf", 1], [T("แรงดึงกลับ", "Pull force"), Math.max(area - rodArea, 0) * x.pressure * 1.019716213, "kgf", 1]] as const, formula: "v = Q × 10,000 ÷ (A × 60)", status: x.rod < x.bore ? T("พร้อมใช้งาน", "Ready") : T("ก้านต้องเล็กกว่ากระบอก", "Rod must be smaller than bore"), healthy: x.rod < x.bore };
  }
  if (module === "belt") {
    const volume = x.capacity / x.density, section = volume / (3600 * x.speed * x.slopeCoefficient), den = Math.tan(x.materialAngle / 3 * Math.PI / 180) + .75 * Math.tan(x.troughAngle * Math.PI / 180), minWidth = ((2 * Math.sqrt(section / den) + .05) / .9) * 1000, mass = volume * x.density * 1000 / (3600 * x.speed), power = (x.coefficient * x.friction * x.length * x.gravity * (mass + 5.375 + x.carryIdler / x.carryPitch) + x.coefficient * x.friction * x.length * x.gravity * (5.375 + x.returnIdler / x.returnPitch)) * x.speed / (1000 * x.efficiency);
    const recommendedWidth = standardBeltWidths.find((width) => width >= minWidth) ?? Math.ceil(minWidth / 200) * 200, widthMargin = x.selectedWidth - minWidth, selectedPasses = widthMargin >= 0;
    return { headline: [T("ความกว้างสายพานขั้นต่ำ", "Minimum belt width"), minWidth, "mm", 0] as const, metrics: [[T("ขนาดมาตรฐานที่แนะนำ", "Recommended standard width"), recommendedWidth, "mm", 0], [T("ระยะเผื่อของขนาดที่เลือก", "Selected width margin"), widthMargin, "mm", 0], [T("กำลังลำเลียงเชิงปริมาตร", "Volume capacity"), volume, "m³/h", 2], [T("กำลังชุดขับ", "Drive power"), power, "kW", 2], [T("ลูกกลิ้งขาไป", "Carrier rollers"), Math.ceil(x.length / x.carryPitch) + 1, "sets", 0], [T("ลูกกลิ้งขากลับ", "Return rollers"), Math.ceil(x.length / x.returnPitch) + 1, "sets", 0]] as const, formula: T("Bmin = ((2√(A ÷ (tan θ₁ + ¾ tan α))) + 0.05) ÷ 0.9\nBstandard = ขนาดมาตรฐานถัดไปที่ ≥ Bmin", "Bmin = ((2√(A ÷ (tan θ₁ + ¾ tan α))) + 0.05) ÷ 0.9\nBstandard = next standard width ≥ Bmin"), status: selectedPasses ? T(`สายพาน ${format(x.selectedWidth, 0)} mm ผ่าน (เผื่อ ${format(widthMargin, 0)} mm)`, `Selected ${format(x.selectedWidth, 0)} mm passes (${format(widthMargin, 0)} mm margin)`) : T(`ขนาด ${format(x.selectedWidth, 0)} mm แคบเกินไป · ใช้อย่างน้อย ${format(recommendedWidth, 0)} mm`, `Selected ${format(x.selectedWidth, 0)} mm is too narrow · use at least ${format(recommendedWidth, 0)} mm`), healthy: selectedPasses };
  }
  if (module === "flat") {
    const pitch = x.bagLength + x.gap, valid = pitch > 0 && x.length > 0 && x.pulleyDiameter > 0 && x.gearEfficiency > 0 && x.motorRpm > 0 && x.driveTeeth > 0 && x.drivenTeeth > 0 && x.gearboxRatio > 0;
    const requiredSpeed = valid ? x.throughput * pitch / 1000 / 60 : 0, speedMS = requiredSpeed / 60, requiredPulleyRpm = valid ? requiredSpeed / (Math.PI * x.pulleyDiameter / 1000) : 0, totalRatio = requiredPulleyRpm > 0 ? x.motorRpm / requiredPulleyRpm : 0, sprocketRatio = valid ? x.drivenTeeth / x.driveTeeth : 0, requiredGearboxRatio = sprocketRatio > 0 ? totalRatio / sprocketRatio : 0;
    const actualPulleyRpm = valid ? x.motorRpm / (x.gearboxRatio * sprocketRatio) : 0, actualSpeed = actualPulleyRpm * Math.PI * x.pulleyDiameter / 1000, actualCapacity = pitch > 0 ? actualSpeed * 60 * 1000 / pitch : 0, speedError = requiredSpeed > 0 ? (actualSpeed - requiredSpeed) / requiredSpeed * 100 : 0;
    const bags = valid ? Math.floor(x.length / pitch) : 0, mass = bags * x.bagWeight, rad = x.angle * Math.PI / 180, force = mass * 9.81 * (Math.cos(rad) * x.friction + Math.sin(rad)), requiredKw = valid ? force * speedMS * x.startupFactor * x.serviceFactor / x.gearEfficiency / 1000 : 0, selectedKw = nextMotor(requiredKw), torque = valid ? requiredKw * 1000 * 60 / (2 * Math.PI * x.motorRpm) : 0, speedOk = Math.abs(speedError) <= 5;
    return { headline: [T("มอเตอร์แนะนำ", "Recommended motor"), selectedKw, "kW", 2] as const, metrics: [[T("รอบพูลเลย์ที่ต้องการ", "Required pulley speed"), requiredPulleyRpm, "rpm", 2], [T("อัตราทดรวมที่ต้องการ", "Required total ratio"), totalRatio, ":1", 2], [T("อัตราทดเฟืองตาม/ขับ", "Driven/drive sprocket ratio"), sprocketRatio, ":1", 2], [T("อัตราทดเกียร์ที่ต้องการ", "Required gearbox ratio"), requiredGearboxRatio, ":1", 2], [T("รอบพูลเลย์จริง", "Actual pulley speed"), actualPulleyRpm, "rpm", 2], [T("ความเร็วสายพานจริง", "Actual belt speed"), actualSpeed, "m/min", 2], [T("อัตราการผลิตจริง", "Actual production rate"), actualCapacity, "bags/h", 0], [T("ความคลาดเคลื่อนความเร็ว", "Speed deviation"), speedError, "%", 2], [T("จำนวนกระสอบบนสายพาน", "Bags on belt"), bags, "bags", 0], [T("แรงบิดขั้นต่ำที่มอเตอร์", "Minimum motor torque"), torque, "N·m", 2]] as const, formula: "Pitch = Lbag + Gap\nvreq = Q × Pitch ÷ 1000 ÷ 60\nnpulley = vreq ÷ (π × Dpulley)\nisprocket = Zdriven ÷ Zdrive\nigearbox = (nmotor ÷ npulley) ÷ isprocket\nPmotor = Ftotal × vreq × SFstart × SFservice ÷ η", status: !valid ? T("กรุณาใส่ค่าที่มากกว่าศูนย์", "Enter values greater than zero") : speedOk ? T("อัตราทดที่เลือกให้ความเร็วอยู่ใน ±5%", "Selected ratio is within ±5% speed") : T("ควรปรับอัตราทดเกียร์ให้ใกล้ค่าที่ต้องการ", "Adjust gearbox ratio toward the required value"), healthy: valid && speedOk };
  }
  if (module === "chain") {
    const materialMass = x.load / x.length, tension = (materialMass * x.length * x.friction + x.movingMass * x.length * x.friction) * 9.81, maxTension = tension * x.speedFactor, power = maxTension / 1000 * x.speed / 60 * x.motorFactor / x.efficiency, rpm = x.speed / (Math.PI * x.sprocketDiameter / 1000), torque = 9550 * power / rpm * x.loadFactor;
    return { headline: [T("แรงดึงโซ่รวม", "Total chain tension"), maxTension, "N", 0] as const, metrics: [[T("กำลังที่ต้องการ", "Required power"), power, "kW", 3], [T("รอบสเตอร์", "Sprocket speed"), rpm, "rpm", 1], [T("แรงบิดออกแบบ", "Design torque"), torque, "N·m", 1], [T("การใช้โหลด", "Load utilization"), maxTension / x.allowance * 100, "%", 1]] as const, formula: "T = (M·L·f + m·L·f) × g", status: maxTension <= x.allowance ? T("โหลดโซ่ผ่าน", "Chain load passes") : T("โหลดโซ่เกินกำหนด", "Chain load exceeds limit"), healthy: maxTension <= x.allowance };
  }
  if (module === "bucket") {
    const volume = x.capacity / x.density, bucketsPerM = 1000 / x.pitch / 2, filling = volume / (x.bucketVolume * bucketsPerM * x.speed * 60), materialMass = x.capacity * 1000 / (x.speed * 60), t1 = materialMass * (x.height + 1) * 9.81 / 1000, t2 = x.bucketWeight * bucketsPerM * (x.height + 1) * 9.81 / 1000, t3 = x.chainWeight * x.stands * (x.height + 1) * 9.81 / 1000, selectTension = (t1 + t2 + t3) / x.stands * x.tempFactor * x.operationFactor, power = t1 * x.speed / 60 / x.efficiency * 1.1, sprocketDiameter = x.pitch / Math.sin(22.5 * Math.PI / 180) / 1000, links = Math.ceil(((x.height * 2 + sprocketDiameter * Math.PI) * x.stands * 1000 / x.pitch) / 4) * 4;
    return { headline: [T("กำลังมอเตอร์ที่ต้องการ", "Required motor power"), power, "kW", 2] as const, metrics: [[T("อัตราการเติม", "Filling"), filling * 100, "%", 1], [T("แรงดึงสำหรับเลือกโซ่", "Selection tension"), selectTension, "kN", 1], [T("จำนวนข้อโซ่", "Chain links"), links, "links", 0], [T("จำนวนบุ้งกี๋", "Buckets"), links / 4, "pcs", 0]] as const, formula: "P = T₁ × V ÷ 60 ÷ η × 1.1", status: x.averageStrength >= selectTension ? T("โซ่ที่เลือกผ่าน", "Selected chain passes") : T("โซ่ที่เลือกไม่ผ่าน", "Selected chain fails"), healthy: x.averageStrength >= selectTension };
  }
  const area = Math.PI / 4 * (x.screwDiameter ** 2 - x.shaftDiameter ** 2), volume = 60 * area * x.pitch * x.rpm * x.filling * x.incline, normal = volume * x.density, max = normal / x.filling, power = max * 9.81 * (x.length * x.friction + x.height) / 3600 / x.efficiency, inner = Math.max(x.pipeOD - 2 * x.pipeThickness, 0), inertia = Math.PI / 64 * (x.pipeOD ** 4 - inner ** 4), weight = Math.PI / 4 * (x.pipeOD ** 2 - inner ** 2) * x.pipeLength * 7850 / 1e9, deflection = 5 * weight * 9.81 * x.pipeLength ** 3 / (384 * x.elasticModulus * inertia), limit = x.pipeLength / 1000;
  return { headline: [T("กำลังลำเลียงสูงสุด", "Maximum capacity"), max, "t/h", 4] as const, metrics: [[T("กำลังลำเลียงปกติ", "Normal capacity"), normal, "t/h", 4], [T("กำลังมอเตอร์", "Motor power"), power, "kW", 4], [T("การโก่งตัวของเพลา", "Pipe deflection"), deflection, "mm", 3], [T("ค่าการโก่งตัวที่ยอมได้", "Deflection limit"), limit, "mm", 2]] as const, formula: "Q = 60 × π/4 × (D² − d²) × S × N × φ × K", status: deflection <= limit ? T("การโก่งตัวผ่าน", "Shaft deflection passes") : T("การโก่งตัวไม่ผ่าน", "Shaft deflection fails"), healthy: deflection <= limit };
}

const ui: Record<string, Bi> = {
  verified: ["ตรวจสอบสูตรแล้ว", "Formula verified"], install: ["ดาวน์โหลดแอป", "Download App"], update: ["อัปเดตแอป", "Update App"], updating: ["กำลังอัปเดต…", "Updating…"], eyebrow: ["เครื่องคำนวณวิศวกรรม · REV 14", "ENGINEERING CALCULATOR · REV 14"], title1: ["คำนวณงานวิศวกรรม", "Engineering math,"], title2: ["ชัดเจนทุกขั้นตอน", "clearly."], inputs: ["ข้อมูลนำเข้า", "INPUTS"], reset: ["ค่าเริ่มต้น", "Reset"], results: ["ผลการคำนวณ", "CALCULATION RESULTS"], formula: ["สูตรที่ใช้", "Formula used"], note: ["รายงาน PDF จะรวมข้อมูลนำเข้า ผลลัพธ์ และสูตรนี้", "The PDF report includes inputs, results, and this formula."], export: ["ส่งออก PDF", "Export PDF"], copy: ["คัดลอกผลลัพธ์", "Copy results"], copied: ["คัดลอกแล้ว ✓", "Copied ✓"], report: ["รายงานการคำนวณ CalFlow", "CalFlow calculation report"],
};

const airStandardOptions: Record<number, { name: Bi; bores: Record<number, number> }> = {
  15552: { name: ["ISO 15552 · กระบอกโปรไฟล์", "ISO 15552 · Profile cylinder"], bores: { 32: 12, 40: 16, 50: 20, 63: 20, 80: 25, 100: 25, 125: 32 } },
  6432: { name: ["ISO 6432 · กระบอกกลม", "ISO 6432 · Round cylinder"], bores: { 8: 4, 10: 4, 12: 6, 16: 6, 20: 8, 25: 10 } },
};

function AirStandardFields({ values, lang, onChange }: { values: NumericFields; lang: Lang; onChange: (next: NumericFields) => void }) {
  const standard = values.standard ?? 0;
  const table = airStandardOptions[standard];
  const setStandard = (nextStandard: number) => {
    const nextTable = airStandardOptions[nextStandard];
    if (!nextTable) { onChange({ ...values, standard: 0 }); return; }
    const available = Object.keys(nextTable.bores).map(Number);
    const bore = nextTable.bores[values.bore] ? values.bore : (nextStandard === 15552 ? 63 : 20);
    onChange({ ...values, standard: nextStandard, bore: available.includes(bore) ? bore : available[0], rod: nextTable.bores[bore] ?? nextTable.bores[available[0]] });
  };
  const setBore = (bore: number) => onChange({ ...values, bore, rod: table?.bores[bore] ?? values.rod });
  return <>
    <label className="field air-standard-field"><span>{lang === "th" ? "มาตรฐานกระบอกลม" : "Cylinder standard"}</span><div className="field-control"><select aria-label={lang === "th" ? "มาตรฐานกระบอกลม" : "Cylinder standard"} value={standard} onChange={(event) => setStandard(Number(event.target.value))}><option value={15552}>{tr(airStandardOptions[15552].name, lang)}</option><option value={6432}>{tr(airStandardOptions[6432].name, lang)}</option><option value={0}>{lang === "th" ? "กำหนดเอง / ผู้ผลิตอื่น" : "Custom / Other manufacturer"}</option></select></div></label>
    <label className="field"><span>{lang === "th" ? "ขนาดกระบอก" : "Bore size"}</span><div className="field-control">{table ? <select aria-label={lang === "th" ? "ขนาดกระบอก" : "Bore size"} value={values.bore} onChange={(event) => setBore(Number(event.target.value))}>{Object.keys(table.bores).map(Number).map((bore) => <option value={bore} key={bore}>Ø {bore}</option>)}</select> : <input aria-label={lang === "th" ? "ขนาดกระบอก" : "Bore size"} type="number" min="0" step="1" value={values.bore} onChange={(event) => onChange({ ...values, bore: Number(event.target.value) })}/>}<em>mm</em></div></label>
    <label className={table ? "field air-locked-field" : "field"}><span>{lang === "th" ? "ขนาดก้าน" : "Rod size"}</span><div className="field-control"><input aria-label={lang === "th" ? "ขนาดก้าน" : "Rod size"} aria-readonly={Boolean(table)} readOnly={Boolean(table)} type="number" min="0" step="1" value={values.rod} onChange={(event) => onChange({ ...values, rod: Number(event.target.value) })}/><em>{table ? "AUTO" : "mm"}</em></div></label>
    <div className={table ? "air-standard-note locked" : "air-standard-note custom"}><i />{table ? (lang === "th" ? `${tr(table.name, lang)} · Bore Ø${values.bore} → Rod Ø${values.rod} mm (ล็อกอัตโนมัติ)` : `${tr(table.name, lang)} · Bore Ø${values.bore} → Rod Ø${values.rod} mm (auto-locked)`) : (lang === "th" ? "โหมดกำหนดเอง: ตรวจสอบ Bore และ Rod จากแคตตาล็อกผู้ผลิต" : "Custom mode: verify bore and rod sizes against the manufacturer catalog")}</div>
  </>;
}

function EngineeringVisual({ module, values, lang }: { module: Exclude<ModuleId, "general" | "scientific">; values: NumericFields; lang: Lang }) {
  const label = lang === "th" ? "ภาพการทำงานแบบไดนามิก" : "Dynamic operating graphic";
  const frame = (graphic: ReactNode, badges: ReactNode) => <div className={`engineering-visual visual-${module}`} role="img" aria-label={label}><div className="visual-topline"><span><i />{label}</span><small>LIVE</small></div>{graphic}<div className="visual-badges">{badges}</div></div>;
  if (module === "air") {
    const duration = Math.max(.9, Math.min(5, 20 / Math.max(values.flow, .1)));
    return frame(<svg viewBox="0 0 340 190" aria-hidden="true"><defs><linearGradient id="air-body" x1="0" x2="1"><stop stopColor="#dce8f5"/><stop offset=".5" stopColor="#f8fbff"/><stop offset="1" stopColor="#c6d4e3"/></linearGradient><linearGradient id="air-pressure" x1="0" x2="1"><stop stopColor="#087af6" stopOpacity=".8"/><stop offset="1" stopColor="#7bc3ff" stopOpacity=".18"/></linearGradient></defs><rect x="36" y="55" width="238" height="88" rx="24" fill="url(#air-body)" stroke="#8fa3b8" strokeWidth="4"/><rect x="51" y="69" width="106" height="60" rx="13" fill="url(#air-pressure)"/><rect x="158" y="60" width="13" height="78" rx="5" fill="#65788d"/><g className="piston-motion" style={{ animationDuration: `${duration}s` }}><rect x="169" y="91" width="126" height="16" rx="8" fill="#b8c4d1" stroke="#65788d" strokeWidth="3"/><circle cx="169" cy="99" r="28" fill="#d8e2ec" stroke="#65788d" strokeWidth="5"/></g><path d="M68 43h74l-12-9m12 9-12 9" fill="none" stroke="#1387ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><text x="72" y="31" fill="#0873e5" fontSize="12" fontWeight="700">PRESSURE</text></svg>, <><span>P = {format(values.pressure, 1)} bar</span><span>Ø {format(values.bore, 0)} / {format(values.rod, 0)} mm</span><span>{values.standard ? `ISO ${values.standard}` : "CUSTOM"}</span></>);
  }
  if (module === "belt" || module === "flat") {
    const flatSpeed = values.throughput * (values.bagLength + values.gap) / 1000 / 60;
    const speed = module === "belt" ? values.speed : flatSpeed;
    const duration = Math.max(.9, Math.min(5, (module === "belt" ? 2.6 : 35) / Math.max(speed, .1)));
    return frame(<svg viewBox="0 0 340 190" aria-hidden="true"><defs><linearGradient id="belt-frame" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#dfe6ee"/><stop offset="1" stopColor="#7f8d9c"/></linearGradient></defs><path d="M49 78h238M49 132h238" stroke="url(#belt-frame)" strokeWidth="15" strokeLinecap="round"/><circle cx="51" cy="105" r="34" fill="#3c4652" stroke="#9eabb8" strokeWidth="7"/><circle cx="287" cy="105" r="34" fill="#3c4652" stroke="#9eabb8" strokeWidth="7"/><circle cx="51" cy="105" r="10" fill="#1387ff"/><circle cx="287" cy="105" r="10" fill="#1387ff"/><path className="belt-motion" style={{ animationDuration: `${duration}s` }} d="M54 78h230" stroke="#1387ff" strokeWidth="4" strokeDasharray="20 15"/><g className="conveyor-loads" style={{ animationDuration: `${duration}s` }}>{module === "flat" ? <><rect x="96" y="47" width="42" height="29" rx="7" fill="#d7ad6d"/><rect x="179" y="47" width="42" height="29" rx="7" fill="#d7ad6d"/></> : <><circle cx="96" cy="66" r="11" fill="#aa9272"/><circle cx="117" cy="62" r="15" fill="#c0a27a"/><circle cx="144" cy="67" r="10" fill="#8f7b63"/><circle cx="197" cy="63" r="14" fill="#b59a76"/><circle cx="222" cy="67" r="10" fill="#947e63"/></>}</g><path d="M122 157h96l-12-9m12 9-12 9" fill="none" stroke="#1387ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><text x="144" y="178" fill="#65717e" fontSize="11">DIRECTION</text></svg>, <><span>v = {format(speed, 2)} {module === "belt" ? "m/s" : "m/min"}</span><span>{module === "belt" ? `L = ${format(values.length, 1)} m` : `D = ${format(values.pulleyDiameter, 0)} mm`}</span></>);
  }
  if (module === "chain") {
    const duration = Math.max(.9, Math.min(5, 45 / Math.max(values.speed, .1)));
    return frame(<svg viewBox="0 0 340 190" aria-hidden="true"><rect x="53" y="57" width="234" height="85" rx="42" fill="none" stroke="#b9c4d0" strokeWidth="16"/><rect className="chain-motion" style={{ animationDuration: `${duration}s` }} x="53" y="57" width="234" height="85" rx="42" fill="none" stroke="#2d3742" strokeWidth="7" strokeDasharray="4 10"/><circle cx="94" cy="99" r="31" fill="#4b5663" stroke="#8795a4" strokeWidth="6"/><circle cx="246" cy="99" r="31" fill="#4b5663" stroke="#8795a4" strokeWidth="6"/><circle cx="94" cy="99" r="9" fill="#1387ff"/><circle cx="246" cy="99" r="9" fill="#1387ff"/><g className="conveyor-loads" style={{ animationDuration: `${duration}s` }}><rect x="115" y="36" width="42" height="20" rx="6" fill="#b49b78"/><rect x="176" y="36" width="42" height="20" rx="6" fill="#a58e70"/></g><path d="M131 161h78l-11-8m11 8-11 8" fill="none" stroke="#1387ff" strokeWidth="4" strokeLinecap="round"/></svg>, <><span>v = {format(values.speed, 1)} m/min</span><span>PCD = {format(values.sprocketDiameter, 1)} mm</span></>);
  }
  if (module === "bucket") {
    const duration = Math.max(.9, Math.min(5, 42 / Math.max(values.speed, .1)));
    return frame(<svg viewBox="0 0 340 190" aria-hidden="true"><rect x="111" y="22" width="118" height="150" rx="48" fill="#eef3f8" stroke="#c2ccd7" strokeWidth="5"/><circle cx="170" cy="54" r="29" fill="#4b5663" stroke="#8e9baa" strokeWidth="6"/><circle cx="170" cy="142" r="29" fill="#4b5663" stroke="#8e9baa" strokeWidth="6"/><path className="bucket-motion" style={{ animationDuration: `${duration}s` }} d="M139 54v88M201 142V54" fill="none" stroke="#1387ff" strokeWidth="8" strokeDasharray="15 13"/><path d="M247 137V58l-9 12m9-12 9 12" fill="none" stroke="#1387ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><text x="235" y="153" fill="#65717e" fontSize="10">LIFT</text></svg>, <><span>v = {format(values.speed, 1)} m/min</span><span>H = {format(values.height, 1)} m</span></>);
  }
  const duration = Math.max(.9, Math.min(5, 4 / Math.max(values.rpm, .1)));
  return frame(<svg viewBox="0 0 340 190" aria-hidden="true"><defs><linearGradient id="screw-case" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f8fbfe"/><stop offset="1" stopColor="#c9d4df"/></linearGradient></defs><rect x="37" y="57" width="238" height="93" rx="20" fill="url(#screw-case)" stroke="#96a5b4" strokeWidth="5"/><path className="screw-motion" style={{ animationDuration: `${duration}s` }} d="M62 102c16-49 32 49 48 0s32 49 48 0 32 49 48 0 32 49 48 0" fill="none" stroke="#66788a" strokeWidth="12" strokeLinecap="round" strokeDasharray="22 7"/><rect x="276" y="74" width="42" height="56" rx="12" fill="#087af6"/><path d="M289 70V52h16v18M286 136h22" stroke="#075bb4" strokeWidth="5" strokeLinecap="round"/><circle cx="296" cy="102" r="8" fill="#d9ecff"/><path d="M82 40h96l-12-9m12 9-12 9" fill="none" stroke="#1387ff" strokeWidth="4" strokeLinecap="round"/></svg>, <><span>N = {format(values.rpm, 1)} rpm</span><span>Fill = {format(values.filling * 100, 0)}%</span></>);
}

type GeneralInput = { key: string; label: Bi; unit: string; step?: number };
type GeneralOutput = { label: Bi; value: number; unit: string; digits?: number };
type GeneralCard = { id: string; title: Bi; eyebrow: Bi; inputs: GeneralInput[]; outputs: GeneralOutput[]; formula: string; healthy?: boolean; status?: Bi };

const generalDefaults: NumericFields = {
  motionDistance: 100, motionTime: 10,
  beltRpm: 45, beltDiameter: .14,
  targetSpeed: 36, motorPulleyDiameter: .165,
  pulleyTargetSpeed: 30, pulleyRpm: 64,
  chainMotorRpm: 50, drivenPcd: 100, driveTeeth: 18, drivenTeeth: 20,
  torquePower: 1.2, torqueRpm: 60,
  feet: 2, inches: 5,
  electricPower: 2, electricHours: 5, electricRate: 4,
  ratedLoad: 3.23, totalWeight: 2.5,
  rectLength: 5, rectWidth: 5, rectHeight: 5,
  cylinderRadius: 3, cylinderHeight: 10,
  coneRadius: 4, coneHeight: 9,
  sphereRadius: 5,
  pyramidLength: 6, pyramidWidth: 6, pyramidHeight: 4,
};

const gf = (key: string, th: string, en: string, unit: string, step = .01): GeneralInput => ({ key, label: [th, en], unit, step });
const safeDivide = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : 0;

function GeneralMiniVisual({ id, values, value }: { id: string; values: NumericFields; value: number }) {
  const output = finite(value);
  const wrap = (graphic: ReactNode) => <div className={`general-mini-visual mini-${id}`} aria-hidden="true"><span>LIVE</span>{graphic}</div>;
  if (id === "motion") {
    const duration = Math.max(.8, Math.min(5, 20 / Math.max(Math.abs(output), .1)));
    return wrap(<svg viewBox="0 0 280 90"><path d="M28 61H252" stroke="#b8c7d7" strokeWidth="6" strokeLinecap="round"/><path d="M38 31h148l-12-9m12 9-12 9" fill="none" stroke="#1387ff" strokeWidth="4" strokeLinecap="round"/><circle className="mini-traveler" style={{ animationDuration: `${duration}s` }} cx="43" cy="61" r="12" fill="#087af6"/><text x="197" y="35" fill="#687584" fontSize="10">v = {format(output, 2)} m/s</text></svg>);
  }
  if (["belt-speed", "motor-rpm", "pulley-diameter"].includes(id)) {
    const duration = Math.max(.8, Math.min(4, 38 / Math.max(Math.abs(output), .1)));
    return wrap(<svg viewBox="0 0 280 90"><path d="M61 35h158M61 68h158" stroke="#8494a4" strokeWidth="9" strokeLinecap="round"/><g className="mini-rotate" style={{ animationDuration: `${duration}s`, transformOrigin: "62px 52px" }}><circle cx="62" cy="52" r="26" fill="#44515e" stroke="#9aabba" strokeWidth="5"/><path d="M62 34v36M44 52h36" stroke="#d9e3ed" strokeWidth="4"/></g><g className="mini-rotate" style={{ animationDuration: `${duration}s`, transformOrigin: "218px 52px" }}><circle cx="218" cy="52" r="26" fill="#44515e" stroke="#9aabba" strokeWidth="5"/><path d="M218 34v36M200 52h36" stroke="#d9e3ed" strokeWidth="4"/></g><path className="mini-dash" style={{ animationDuration: `${duration}s` }} d="M67 35h145" stroke="#1387ff" strokeWidth="4" strokeDasharray="18 12"/></svg>);
  }
  if (id === "chain-speed") {
    const duration = Math.max(.8, Math.min(4, 38 / Math.max(Math.abs(output), .1)));
    return wrap(<svg viewBox="0 0 280 90"><rect x="42" y="20" width="196" height="54" rx="27" fill="none" stroke="#c1ccd7" strokeWidth="11"/><rect className="mini-chain" style={{ animationDuration: `${duration}s` }} x="42" y="20" width="196" height="54" rx="27" fill="none" stroke="#4c5967" strokeWidth="5" strokeDasharray="4 9"/><circle cx="72" cy="47" r="18" fill="#667584"/><circle cx="208" cy="47" r="18" fill="#667584"/><circle cx="72" cy="47" r="6" fill="#1387ff"/><circle cx="208" cy="47" r="6" fill="#1387ff"/></svg>);
  }
  if (id === "motor-torque") {
    const duration = Math.max(.8, Math.min(4, 120 / Math.max(Math.abs(output), .1)));
    return wrap(<svg viewBox="0 0 280 90"><rect x="78" y="25" width="124" height="45" rx="18" fill="#d9e4ef" stroke="#8fa1b3" strokeWidth="4"/><g className="mini-rotate" style={{ animationDuration: `${duration}s`, transformOrigin: "140px 47px" }}><circle cx="140" cy="47" r="30" fill="#087af6" stroke="#b9ddff" strokeWidth="6"/><path d="M140 24v46M117 47h46M124 31l32 32M156 31l-32 32" stroke="#e7f4ff" strokeWidth="4"/></g><path d="M203 47h49" stroke="#6d7c8b" strokeWidth="11" strokeLinecap="round"/></svg>);
  }
  if (id === "unit-conversion") {
    const marker = 30 + (Math.abs(output) % 1000) / 1000 * 220;
    return wrap(<svg viewBox="0 0 280 90"><rect x="24" y="27" width="232" height="43" rx="10" fill="#fff2bf" stroke="#d9b84e" strokeWidth="3"/>{[0,1,2,3,4,5,6,7,8,9,10].map((tick) => <path key={tick} d={`M${34 + tick * 21.2} 30v${tick % 5 === 0 ? 23 : 13}`} stroke="#806a24" strokeWidth="2"/>)}<path d={`M${marker} 18v61`} stroke="#087af6" strokeWidth="4" strokeLinecap="round"/><circle cx={marker} cy="18" r="6" fill="#087af6"/></svg>);
  }
  if (id === "electricity") {
    const levels = [values.electricPower, values.electricHours, values.electricRate, output].map((item) => 12 + Math.min(48, Math.log10(Math.abs(item) + 1) * 27));
    return wrap(<svg viewBox="0 0 280 90"><path className="mini-pulse" d="M30 48h52l13-23 19 46 18-34 14 22 17-11h87" fill="none" stroke="#1387ff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><g fill="#83bdff" opacity=".45">{levels.map((height, index) => <rect key={index} x={50 + index * 52} y={82 - height} width="27" height={height} rx="6"/>)}</g></svg>);
  }
  if (id === "load-utilization") {
    const percent = Math.max(0, Math.min(100, output)), angle = -70 + percent * 1.4;
    return wrap(<svg viewBox="0 0 280 90"><path d="M73 72a67 67 0 01134 0" fill="none" stroke="#d9e3ed" strokeWidth="17" strokeLinecap="round"/><path d="M73 72a67 67 0 01107-54" fill="none" stroke={percent <= 80 ? "#34c759" : "#ff9f0a"} strokeWidth="17" strokeLinecap="round"/><path d="M140 72V27" stroke="#344150" strokeWidth="5" strokeLinecap="round" transform={`rotate(${angle} 140 72)`}/><circle cx="140" cy="72" r="10" fill="#344150"/><text x="122" y="61" fill="#53606d" fontSize="11" fontWeight="700">{format(percent, 1)}%</text></svg>);
  }
  const fillHeight = Math.min(48, 12 + Math.log10(Math.abs(output) + 1) * 16), fillY = 76 - fillHeight;
  const shape = id === "rect-volume" ? <rect x="78" y="18" width="124" height="61" rx="8"/> : id === "cylinder-volume" ? <><ellipse cx="140" cy="24" rx="58" ry="14"/><path d="M82 24v48c0 18 116 18 116 0V24"/><ellipse cx="140" cy="72" rx="58" ry="14"/></> : id === "cone-volume" ? <path d="M140 12L72 76h136z"/> : id === "sphere-volume" ? <><circle cx="140" cy="46" r="38"/><ellipse cx="140" cy="46" rx="38" ry="14"/></> : <path d="M140 10L70 72h140zM140 10l32 62"/>;
  return wrap(<svg viewBox="0 0 280 90"><defs><linearGradient id={`volume-fill-${id}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#54a9ff"/><stop offset="1" stopColor="#087af6"/></linearGradient></defs><rect className="mini-volume-fill" x="69" y={fillY} width="142" height={fillHeight} rx="8" fill={`url(#volume-fill-${id})`} opacity=".3"/><g fill="rgba(240,246,252,.72)" stroke="#66798b" strokeWidth="4" strokeLinejoin="round">{shape}</g><path className="mini-wave" d={`M76 ${fillY + 8}q16-8 32 0t32 0 32 0 32 0`} fill="none" stroke="#1387ff" strokeWidth="3"/></svg>);
}

type AngleMode = "DEG" | "RAD";
type CalcToken = { type: "number" | "ident" | "op" | "left" | "right"; value: string };

const calcFunctions = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "sqrt", "cbrt", "ln", "log", "exp", "abs", "floor", "ceil", "round"]);

function tokenizeExpression(source: string): CalcToken[] {
  const input = source.replaceAll("×", "*").replaceAll("÷", "/").replaceAll("−", "-").replaceAll("√", "sqrt");
  const tokens: CalcToken[] = [];
  let index = 0;
  while (index < input.length) {
    const rest = input.slice(index);
    if (/^\s/.test(rest)) { index += 1; continue; }
    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) { tokens.push({ type: "number", value: number[0] }); index += number[0].length; continue; }
    const ident = rest.match(/^[a-zA-Zπ]+/);
    if (ident) { tokens.push({ type: "ident", value: ident[0].toLowerCase() }); index += ident[0].length; continue; }
    const char = input[index];
    if ("+-*/^!%".includes(char)) tokens.push({ type: "op", value: char });
    else if (char === "(") tokens.push({ type: "left", value: char });
    else if (char === ")") tokens.push({ type: "right", value: char });
    else throw new Error(`Unsupported character: ${char}`);
    index += 1;
  }
  return tokens;
}

function evaluateExpression(source: string, angleMode: AngleMode, ans: number) {
  if (!source.trim()) return 0;
  const tokens = tokenizeExpression(source);
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const radians = (value: number) => angleMode === "DEG" ? value * Math.PI / 180 : value;
  const fromRadians = (value: number) => angleMode === "DEG" ? value * 180 / Math.PI : value;
  const applyFunction = (name: string, value: number) => {
    const functions: Record<string, (x: number) => number> = {
      sin: (x) => Math.sin(radians(x)), cos: (x) => Math.cos(radians(x)), tan: (x) => Math.tan(radians(x)),
      asin: (x) => fromRadians(Math.asin(x)), acos: (x) => fromRadians(Math.acos(x)), atan: (x) => fromRadians(Math.atan(x)),
      sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, cbrt: Math.cbrt,
      ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
    };
    const result = functions[name](value);
    if (!Number.isFinite(result)) throw new Error("Result is outside the valid range");
    return result;
  };
  const factorial = (value: number) => {
    if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error("Factorial requires an integer from 0 to 170");
    let result = 1;
    for (let n = 2; n <= value; n += 1) result *= n;
    return result;
  };
  const parsePrimary = (): number => {
    const token = take();
    if (!token) throw new Error("Incomplete expression");
    if (token.type === "number") return Number(token.value);
    if (token.type === "left") {
      const value = parseExpression();
      if (take()?.type !== "right") throw new Error("Missing closing parenthesis");
      return value;
    }
    if (token.type === "ident") {
      if (token.value === "pi" || token.value === "π") return Math.PI;
      if (token.value === "e") return Math.E;
      if (token.value === "ans") return ans;
      if (!calcFunctions.has(token.value) || take()?.type !== "left") throw new Error(`Unknown function: ${token.value}`);
      const value = parseExpression();
      if (take()?.type !== "right") throw new Error("Missing closing parenthesis");
      return applyFunction(token.value, value);
    }
    throw new Error("Expected a number or function");
  };
  const parsePostfix = () => {
    let value = parsePrimary();
    while (peek()?.type === "op" && ["!", "%"].includes(peek().value)) value = take().value === "!" ? factorial(value) : value / 100;
    return value;
  };
  const parsePower = (): number => {
    const value = parsePostfix();
    return peek()?.value === "^" ? Math.pow(value, (take(), parseUnary())) : value;
  };
  const parseUnary = (): number => {
    if (peek()?.value === "+") { take(); return parseUnary(); }
    if (peek()?.value === "-") { take(); return -parseUnary(); }
    return parsePower();
  };
  const startsPrimary = (token?: CalcToken) => token?.type === "number" || token?.type === "ident" || token?.type === "left";
  const parseTerm = () => {
    let value = parseUnary();
    while (peek()) {
      if (peek().type === "op" && ["*", "/"].includes(peek().value)) {
        const operator = take().value, right = parseUnary();
        value = operator === "*" ? value * right : value / right;
      } else if (peek().type === "ident" && peek().value === "mod") {
        take(); value %= parseUnary();
      } else if (startsPrimary(peek())) value *= parseUnary();
      else break;
    }
    return value;
  };
  const parseExpression = () => {
    let value = parseTerm();
    while (peek()?.type === "op" && ["+", "-"].includes(peek().value)) {
      const operator = take().value, right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const value = parseExpression();
  if (index !== tokens.length || !Number.isFinite(value)) throw new Error("Invalid expression");
  return value;
}

function formatCalculatorValue(value: number) {
  const absolute = Math.abs(value);
  if ((absolute >= 1e12 || (absolute > 0 && absolute < 1e-9))) return value.toExponential(8);
  return Number(value.toPrecision(12)).toLocaleString("en-US", { maximumFractionDigits: 10 });
}

function TrigVisual({ lang }: { expression: string; angleMode: AngleMode; ans: number; lang: Lang }) {
  const [base, setBase] = useState(100), [height, setHeight] = useState(500);
  const safeBase = Math.max(0, base), safeHeight = Math.max(0, height);
  const hypotenuse = Math.hypot(safeBase, safeHeight);
  const angle = Math.atan2(safeHeight, safeBase) * 180 / Math.PI;
  const otherAngle = 90 - angle;
  const ratio = safeHeight / Math.max(safeBase, .000001);
  const visualRatio = Math.max(.18, Math.min(4, ratio));
  const triangleWidth = Math.min(68, 60 / (visualRatio * 1.6));
  const triangleHeight = visualRatio * 1.6 * triangleWidth;
  const sine = hypotenuse ? safeHeight / hypotenuse : 0;
  const cosine = hypotenuse ? safeBase / hypotenuse : 0;
  const tangent = safeBase ? safeHeight / safeBase : Infinity;
  const aria = lang === "th" ? `สามเหลี่ยมมุมฉาก ฐาน ${safeBase} สูง ${safeHeight} ด้านทแยง ${hypotenuse.toFixed(2)}` : `Right triangle, base ${safeBase}, height ${safeHeight}, hypotenuse ${hypotenuse.toFixed(2)}`;
  return <div className="trig-visual">
    <div className="trig-visual-header"><div><span>{lang === "th" ? "คำนวณตรีโกณมิติ" : "TRIGONOMETRY"}</span><strong>{lang === "th" ? "สามเหลี่ยมมุมฉาก" : "Right triangle"}</strong></div><em>LIVE</em></div>
    <div className="triangle-inputs">
      <label><span>{lang === "th" ? "ฐาน / ความยาว" : "Base / Length"}</span><div><input aria-label={lang === "th" ? "ฐานหรือความยาว" : "Base or length"} type="number" min="0" step="any" value={base} onChange={(event) => setBase(Number(event.target.value))}/><em>mm</em></div></label>
      <label><span>{lang === "th" ? "ความสูง" : "Height"}</span><div><input aria-label={lang === "th" ? "ความสูง" : "Height"} type="number" min="0" step="any" value={height} onChange={(event) => setHeight(Number(event.target.value))}/><em>mm</em></div></label>
    </div>
    <div className="triangle-stage" role="img" aria-label={aria}>
      <div className="triangle-shape" style={{ width: `${triangleWidth}%`, height: `${triangleHeight}%`, left: `${(100 - triangleWidth) / 2}%` }}>
        <span className="triangle-base-label">{formatCalculatorValue(safeBase)} mm</span><span className="triangle-height-label">{formatCalculatorValue(safeHeight)} mm</span><span className="triangle-hypotenuse-label">{lang === "th" ? "ทแยง" : "HYP"} {formatCalculatorValue(hypotenuse)} mm</span><i className="right-angle"/>
      </div>
      <span className="triangle-angle">θ = {formatCalculatorValue(angle)}°</span>
    </div>
    <div className="triangle-results"><div className="primary"><span>{lang === "th" ? "ด้านทแยง" : "Hypotenuse"}</span><strong>{formatCalculatorValue(hypotenuse)} <small>mm</small></strong></div><div><span>{lang === "th" ? "มุม θ" : "Angle θ"}</span><strong>{formatCalculatorValue(angle)}°</strong></div><div><span>{lang === "th" ? "มุมที่เหลือ" : "Other angle"}</span><strong>{formatCalculatorValue(otherAngle)}°</strong></div></div>
    <div className="trig-values">{([["sin", sine], ["cos", cosine], ["tan", tangent]] as const).map(([name, value]) => <div key={name}><span>{name} θ</span><strong>{Number.isFinite(value) ? formatCalculatorValue(value) : "∞"}</strong></div>)}</div>
    <p>{lang === "th" ? "c = √(ฐาน² + สูง²) · θ = atan(สูง ÷ ฐาน)" : "c = √(base² + height²) · θ = atan(height ÷ base)"}</p>
  </div>;
}

function ScientificCalculator({ lang, exportLabel }: { lang: Lang; exportLabel: string }) {
  const [expression, setExpression] = useState("sin(30)"), [angleMode, setAngleMode] = useState<AngleMode>("DEG"), [ans, setAns] = useState(.5), [memory, setMemory] = useState(0), [history, setHistory] = useState<Array<{ expression: string; result: number }>>([]), [copied, setCopied] = useState(false);
  const preview = useMemo(() => { try { return { value: evaluateExpression(expression, angleMode, ans), error: "" }; } catch (error) { return { value: NaN, error: error instanceof Error ? error.message : "Invalid expression" }; } }, [expression, angleMode, ans]);
  const append = (text: string) => setExpression((current) => current === "0" ? text : current + text);
  const clear = () => setExpression("");
  const calculateNow = () => {
    if (preview.error || !expression.trim()) return;
    setAns(preview.value);
    setHistory((current) => [{ expression, result: preview.value }, ...current.filter((item) => item.expression !== expression)].slice(0, 8));
    setExpression(String(Number(preview.value.toPrecision(14))));
  };
  const copyResult = async () => {
    if (preview.error) return;
    await navigator.clipboard.writeText(`${expression} = ${formatCalculatorValue(preview.value)}`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  };
  const functions = [["sin", "sin("], ["cos", "cos("], ["tan", "tan("], ["sin⁻¹", "asin("], ["cos⁻¹", "acos("], ["tan⁻¹", "atan("], ["sinh", "sinh("], ["cosh", "cosh("], ["tanh", "tanh("], ["ln", "ln("], ["log₁₀", "log("], ["√", "sqrt("], ["∛", "cbrt("], ["|x|", "abs("], ["eˣ", "exp("], ["x!", "!"], ["x²", "square"], ["1/x", "reciprocal"]] as const;
  const keypad = [["7", "7"], ["8", "8"], ["9", "9"], ["÷", "÷"], ["AC", "clear"], ["4", "4"], ["5", "5"], ["6", "6"], ["×", "×"], ["⌫", "back"], ["1", "1"], ["2", "2"], ["3", "3"], ["−", "−"], ["(", "("], ["0", "0"], [".", "."], ["π", "π"], ["+", "+"], [")", ")"], ["Ans", "Ans"], ["e", "e"], ["%", "%"], ["xʸ", "^"], ["=", "equals"]] as const;
  const press = (action: string) => {
    if (action === "clear") clear();
    else if (action === "back") setExpression((current) => current.slice(0, -1));
    else if (action === "equals") calculateNow();
    else if (action === "square") setExpression((current) => `(${current || 0})^2`);
    else if (action === "reciprocal") setExpression((current) => `1/(${current || 0})`);
    else append(action);
  };
  return <section className="scientific-section" aria-live="polite">
    <div className="scientific-heading glass-card"><div><span className="section-kicker">SCIENTIFIC & ENGINEERING</span><h2>{lang === "th" ? "เครื่องคิดเลขวิทยาศาสตร์" : "Scientific calculator"}</h2><p>{lang === "th" ? "คำนวณตรีโกณมิติ ลอการิทึม ยกกำลัง ราก แฟกทอเรียล และสมการหลายขั้นตอน" : "Trigonometry, logarithms, powers, roots, factorials, and multi-step expressions."}</p></div><button className="general-export no-print" onClick={() => window.print()}>{exportLabel} ↓</button></div>
    <div className="scientific-layout">
      <div className="calculator-shell glass-card">
        <div className="calculator-toolbar"><div className="angle-switch" aria-label={lang === "th" ? "หน่วยมุม" : "Angle unit"}><button className={angleMode === "DEG" ? "active" : ""} onClick={() => setAngleMode("DEG")}>DEG</button><button className={angleMode === "RAD" ? "active" : ""} onClick={() => setAngleMode("RAD")}>RAD</button></div><span className="memory-indicator">M = {formatCalculatorValue(memory)}</span></div>
        <div className="calculator-display"><label htmlFor="engineering-expression">{lang === "th" ? "สมการ" : "Expression"}</label><input id="engineering-expression" value={expression} onChange={(event) => setExpression(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); calculateNow(); } else if (event.key === "Escape") clear(); }} placeholder="sin(30) + sqrt(16)" autoComplete="off" spellCheck={false}/><div className={preview.error ? "calculator-result error" : "calculator-result"}><small>{preview.error ? (lang === "th" ? "ตรวจสอบสมการ" : "Check expression") : "="}</small><strong>{preview.error ? "—" : formatCalculatorValue(preview.value)}</strong></div></div>
        <div className="memory-row no-print"><button onClick={() => setMemory(0)}>MC</button><button onClick={() => append(memory < 0 ? `(${memory})` : String(memory))}>MR</button><button onClick={() => !preview.error && setMemory((value) => value + preview.value)}>M+</button><button onClick={() => !preview.error && setMemory((value) => value - preview.value)}>M−</button><button onClick={() => setExpression((current) => `-(${current || 0})`)}>±</button><button onClick={() => append(" mod ")}>mod</button></div>
        <div className="function-grid no-print">{functions.map(([label, action]) => <button key={label} onClick={() => press(action)}>{label}</button>)}</div>
        <div className="calculator-keypad no-print">{keypad.map(([label, action]) => <button key={label} className={action === "equals" ? "equals" : ["÷", "×", "−", "+", "^"].includes(action) ? "operator" : action === "clear" || action === "back" ? "utility" : ""} onClick={() => press(action)}>{label}</button>)}</div>
        <div className="calculator-actions no-print"><button className="secondary-button" onClick={copyResult}>{copied ? (lang === "th" ? "คัดลอกแล้ว ✓" : "Copied ✓") : (lang === "th" ? "คัดลอกคำตอบ" : "Copy result")}</button><button className="primary-button" onClick={calculateNow}>{lang === "th" ? "คำนวณ" : "Calculate"}</button></div>
        <p className="calculator-hint">{lang === "th" ? "พิมพ์สมการได้โดยตรง • Enter เพื่อคำนวณ • Esc เพื่อล้าง" : "Type an expression directly • Enter to calculate • Esc to clear"}</p>
      </div>
      <aside className="calculator-side glass-card"><TrigVisual expression={expression} angleMode={angleMode} ans={ans} lang={lang}/><div className="constant-card"><span>{lang === "th" ? "ค่าคงที่" : "CONSTANTS"}</span><button onClick={() => append("π")}><strong>π</strong><small>3.141592653589793</small></button><button onClick={() => append("e")}><strong>e</strong><small>2.718281828459045</small></button><button onClick={() => append("Ans")}><strong>Ans</strong><small>{formatCalculatorValue(ans)}</small></button></div><div className="history-card"><div><span>{lang === "th" ? "ประวัติ" : "HISTORY"}</span>{history.length > 0 && <button className="no-print" onClick={() => setHistory([])}>{lang === "th" ? "ล้าง" : "Clear"}</button>}</div>{history.length === 0 ? <p>{lang === "th" ? "คำตอบที่คำนวณแล้วจะแสดงที่นี่" : "Completed calculations appear here."}</p> : history.map((item, index) => <button key={`${item.expression}-${index}`} onClick={() => { setExpression(item.expression); setAns(item.result); }}><span>{item.expression}</span><strong>= {formatCalculatorValue(item.result)}</strong></button>)}</div><div className="supported-card"><span>{lang === "th" ? "รองรับ" : "SUPPORTED"}</span><p>sin · cos · tan · inverse · hyperbolic</p><p>ln · log₁₀ · √ · ∛ · xʸ · x! · mod · %</p><p>π · e · Ans · DEG / RAD · Memory</p></div></aside>
    </div>
  </section>;
}

function GeneralCalculators({ lang, exportLabel }: { lang: Lang; exportLabel: string }) {
  const [values, setValues] = useState<NumericFields>({ ...generalDefaults });
  const updateGeneral = (key: string, value: string) => setValues((current) => ({ ...current, [key]: Number(value) }));
  const cards: GeneralCard[] = [
    { id: "motion", title: ["ความเร็วจากระยะทาง", "Speed from distance"], eyebrow: ["การเคลื่อนที่", "MOTION"], inputs: [gf("motionDistance", "ระยะทาง", "Distance", "m"), gf("motionTime", "เวลา", "Time", "s")], outputs: [{ label: ["ความเร็ว", "Speed"], value: safeDivide(values.motionDistance, values.motionTime), unit: "m/s", digits: 3 }, { label: ["ความเร็ว", "Speed"], value: safeDivide(values.motionDistance, values.motionTime) * 60, unit: "m/min", digits: 2 }], formula: "v = s ÷ t" },
    { id: "belt-speed", title: ["ความเร็วสายพาน", "Belt speed"], eyebrow: ["สายพาน", "BELT"], inputs: [gf("beltRpm", "รอบเพลา", "Shaft speed", "rpm"), gf("beltDiameter", "เส้นผ่านศูนย์กลางพูลเลย์", "Pulley diameter", "m", .001)], outputs: [{ label: ["ความเร็วสายพาน", "Belt speed"], value: values.beltRpm * Math.PI * values.beltDiameter, unit: "m/min", digits: 3 }, { label: ["ความเร็วสายพาน", "Belt speed"], value: values.beltRpm * Math.PI * values.beltDiameter / 60, unit: "m/s", digits: 3 }], formula: "v = n × π × D" },
    { id: "motor-rpm", title: ["หารอบเพลา", "Required shaft RPM"], eyebrow: ["ระบบขับ", "DRIVE"], inputs: [gf("targetSpeed", "ความเร็วสายพาน", "Belt speed", "m/min"), gf("motorPulleyDiameter", "เส้นผ่านศูนย์กลางพูลเลย์", "Pulley diameter", "m", .001)], outputs: [{ label: ["รอบเพลาที่ต้องการ", "Required shaft speed"], value: safeDivide(values.targetSpeed, Math.PI * values.motorPulleyDiameter), unit: "rpm", digits: 2 }], formula: "n = v ÷ (π × D)" },
    { id: "pulley-diameter", title: ["หาขนาดพูลเลย์", "Pulley diameter"], eyebrow: ["ระบบขับ", "DRIVE"], inputs: [gf("pulleyTargetSpeed", "ความเร็วสายพาน", "Belt speed", "m/min"), gf("pulleyRpm", "รอบเพลา", "Shaft speed", "rpm")], outputs: [{ label: ["ขนาดพูลเลย์", "Pulley diameter"], value: safeDivide(values.pulleyTargetSpeed, Math.PI * values.pulleyRpm) * 1000, unit: "mm", digits: 1 }], formula: "D = v ÷ (π × n)" },
    { id: "chain-speed", title: ["ความเร็วโซ่", "Chain speed"], eyebrow: ["โซ่และสเตอร์", "CHAIN & SPROCKET"], inputs: [gf("chainMotorRpm", "รอบเพลาขับ", "Drive shaft speed", "rpm"), gf("drivenPcd", "PCD สเตอร์ตาม", "Driven sprocket PCD", "mm"), gf("driveTeeth", "ฟันสเตอร์ขับ", "Drive teeth", "T", 1), gf("drivenTeeth", "ฟันสเตอร์ตาม", "Driven teeth", "T", 1)], outputs: [{ label: ["อัตราทดสเตอร์", "Sprocket ratio"], value: safeDivide(values.drivenTeeth, values.driveTeeth), unit: ":1", digits: 3 }, { label: ["ความเร็วโซ่", "Chain speed"], value: values.chainMotorRpm * Math.PI * values.drivenPcd / 1000 * safeDivide(values.driveTeeth, values.drivenTeeth), unit: "m/min", digits: 3 }], formula: "i = Z₂ ÷ Z₁\nv = n₁ × (Z₁ ÷ Z₂) × π × PCD₂" },
    { id: "motor-torque", title: ["แรงบิดมอเตอร์", "Motor torque"], eyebrow: ["กำลังและแรงบิด", "POWER & TORQUE"], inputs: [gf("torquePower", "กำลังมอเตอร์", "Motor power", "kW"), gf("torqueRpm", "รอบมอเตอร์", "Motor speed", "rpm")], outputs: [{ label: ["แรงบิด", "Torque"], value: safeDivide(9550 * values.torquePower, values.torqueRpm), unit: "N·m", digits: 2 }], formula: "T = 9,550 × P ÷ n" },
    { id: "unit-conversion", title: ["แปลงฟุตและนิ้ว", "Feet & inches conversion"], eyebrow: ["แปลงหน่วย", "UNIT CONVERSION"], inputs: [gf("feet", "ฟุต", "Feet", "ft", 1), gf("inches", "นิ้ว", "Inches", "in")], outputs: [{ label: ["ความยาว", "Length"], value: (values.feet * 12 + values.inches) * 25.4, unit: "mm", digits: 2 }, { label: ["ความยาว", "Length"], value: (values.feet * 12 + values.inches) * .0254, unit: "m", digits: 4 }], formula: "Lmm = (ft × 12 + in) × 25.4" },
    { id: "electricity", title: ["ค่าไฟฟ้า", "Electricity cost"], eyebrow: ["พลังงาน", "ENERGY"], inputs: [gf("electricPower", "กำลังไฟฟ้า", "Power", "kW"), gf("electricHours", "เวลาใช้งาน", "Operating time", "h"), gf("electricRate", "ค่าไฟต่อหน่วย", "Energy rate", "฿/kWh")], outputs: [{ label: ["พลังงานไฟฟ้า", "Energy"], value: values.electricPower * values.electricHours, unit: "kWh", digits: 2 }, { label: ["ค่าไฟ", "Electricity cost"], value: values.electricPower * values.electricHours * values.electricRate, unit: "฿", digits: 2 }], formula: "E = P × t\nCost = E × rate" },
    { id: "load-utilization", title: ["การใช้พิกัดยก", "Lifting utilization"], eyebrow: ["แผนการยก", "LIFTING PLAN"], inputs: [gf("ratedLoad", "พิกัดยกตามตาราง", "Rated load", "t"), gf("totalWeight", "น้ำหนักรวม", "Total weight", "t")], outputs: [{ label: ["การใช้พิกัด", "Capacity utilization"], value: safeDivide(values.totalWeight, values.ratedLoad) * 100, unit: "%", digits: 1 }, { label: ["พิกัดคงเหลือ", "Remaining capacity"], value: values.ratedLoad - values.totalWeight, unit: "t", digits: 2 }], formula: "Utilization = Wtotal ÷ Wrated × 100", healthy: safeDivide(values.totalWeight, values.ratedLoad) * 100 <= 80, status: safeDivide(values.totalWeight, values.ratedLoad) * 100 <= 80 ? ["ผ่านเกณฑ์ไม่เกิน 80%", "Passes the 80% limit"] : ["เกินเกณฑ์ 80%", "Exceeds the 80% limit"] },
    { id: "rect-volume", title: ["ปริมาตรทรงสี่เหลี่ยม", "Rectangular volume"], eyebrow: ["เรขาคณิต", "GEOMETRY"], inputs: [gf("rectLength", "ความยาว", "Length", "m"), gf("rectWidth", "ความกว้าง", "Width", "m"), gf("rectHeight", "ความสูง", "Height", "m")], outputs: [{ label: ["ปริมาตร", "Volume"], value: values.rectLength * values.rectWidth * values.rectHeight, unit: "m³", digits: 3 }], formula: "V = L × W × H" },
    { id: "cylinder-volume", title: ["ปริมาตรทรงกระบอก", "Cylinder volume"], eyebrow: ["เรขาคณิต", "GEOMETRY"], inputs: [gf("cylinderRadius", "รัศมี", "Radius", "m"), gf("cylinderHeight", "ความสูง", "Height", "m")], outputs: [{ label: ["ปริมาตร", "Volume"], value: Math.PI * values.cylinderRadius ** 2 * values.cylinderHeight, unit: "m³", digits: 3 }], formula: "V = π × r² × h" },
    { id: "cone-volume", title: ["ปริมาตรทรงกรวย", "Cone volume"], eyebrow: ["เรขาคณิต", "GEOMETRY"], inputs: [gf("coneRadius", "รัศมี", "Radius", "m"), gf("coneHeight", "ความสูง", "Height", "m")], outputs: [{ label: ["ปริมาตร", "Volume"], value: Math.PI * values.coneRadius ** 2 * values.coneHeight / 3, unit: "m³", digits: 3 }], formula: "V = ⅓ × π × r² × h" },
    { id: "sphere-volume", title: ["ปริมาตรทรงกลม", "Sphere volume"], eyebrow: ["เรขาคณิต", "GEOMETRY"], inputs: [gf("sphereRadius", "รัศมี", "Radius", "m")], outputs: [{ label: ["ปริมาตร", "Volume"], value: 4 * Math.PI * values.sphereRadius ** 3 / 3, unit: "m³", digits: 3 }], formula: "V = ⁴⁄₃ × π × r³" },
    { id: "pyramid-volume", title: ["ปริมาตรปิรามิด", "Pyramid volume"], eyebrow: ["เรขาคณิต", "GEOMETRY"], inputs: [gf("pyramidLength", "ความยาวฐาน", "Base length", "m"), gf("pyramidWidth", "ความกว้างฐาน", "Base width", "m"), gf("pyramidHeight", "ความสูง", "Height", "m")], outputs: [{ label: ["ปริมาตร", "Volume"], value: values.pyramidLength * values.pyramidWidth * values.pyramidHeight / 3, unit: "m³", digits: 3 }], formula: "V = ⅓ × L × W × H" },
  ];

  return <section className="general-section" aria-live="polite">
    <div className="general-heading"><div><span className="section-kicker">{lang === "th" ? "GENERAL CALCULATORS" : "GENERAL CALCULATORS"}</span><h2>{lang === "th" ? "เครื่องคำนวณใช้งานทั่วไป" : "Everyday engineering calculators"}</h2><p>{lang === "th" ? "รวมสูตรจากชีต General และแก้สมการแรงบิดให้ถูกต้องตามหลักวิศวกรรม" : "Workbook-based general formulas with the motor-torque equation corrected for engineering use."}</p></div><div className="general-actions no-print"><button className="text-button" onClick={() => setValues({ ...generalDefaults })}>{lang === "th" ? "ค่าเริ่มต้น" : "Reset"}</button><button className="general-export" onClick={() => window.print()}>{exportLabel} ↓</button></div></div>
    <div className="general-grid">{cards.map((card) => <article className="general-card glass-card" key={card.id}><div className="general-card-title"><span>{tr(card.eyebrow, lang)}</span><h3>{tr(card.title, lang)}</h3></div><GeneralMiniVisual id={card.id} values={values} value={card.outputs[0].value} /><div className="general-inputs">{card.inputs.map((input) => <label className="general-field" key={input.key}><span>{tr(input.label, lang)}</span><div><input type="number" step={input.step} value={values[input.key]} onChange={(event) => updateGeneral(input.key, event.target.value)} aria-label={tr(input.label, lang)} /><em>{input.unit}</em></div></label>)}</div><div className="general-outputs">{card.outputs.map((output, index) => <div key={`${card.id}-${index}`}><span>{tr(output.label, lang)}</span><strong>{format(output.value, output.digits ?? 2)} <small>{output.unit}</small></strong></div>)}</div>{card.status && <div className={card.healthy ? "general-status good" : "general-status warning"}><i />{tr(card.status, lang)}</div>}<code className="general-formula">{card.formula}</code></article>)}</div>
  </section>;
}

export default function Home() {
  const [active, setActive] = useState<ModuleId>("general"), [lang, setLang] = useState<Lang>("th"), [inputs, setInputs] = useState<Record<ModuleId, NumericFields>>(defaults), [copied, setCopied] = useState(false), [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null), [standalone, setStandalone] = useState(false), [updating, setUpdating] = useState(false);
  const result = useMemo(() => calculate(active, inputs[active], lang), [active, inputs, lang]), current = modules.find((item) => item.id === active)!;
  const [headlineLabel, headlineValue, headlineUnit, headlineDigits] = result.headline;
  const U = (key: string) => tr(ui[key], lang);
  const update = (key: string, value: string) => setInputs((state) => ({ ...state, [active]: { ...state[active], [key]: Number(value) } }));
  const copySummary = async () => { const lines = [`${tr(current.label, lang)} — ${result.status}`, `${headlineLabel}: ${format(headlineValue, headlineDigits)} ${headlineUnit}`, ...result.metrics.map(([label, value, unit, digits]) => `${label}: ${format(value, digits)} ${unit}`), "", U("formula"), result.formula]; await navigator.clipboard.writeText(lines.join("\n")); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  const exportPdf = () => { const previous = document.title; document.title = `CalFlow - ${tr(current.label, lang)}`; window.print(); window.setTimeout(() => { document.title = previous; }, 300); };
  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    let refreshing = false;
    const reloadForUpdate = () => { if (!refreshing) { refreshing = true; window.location.reload(); } };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", reloadForUpdate);
      const workerUrl = new URL("sw.js?v=14", window.location.href);
      navigator.serviceWorker.register(`${workerUrl.pathname}${workerUrl.search}`, { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => undefined);
    }
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => { window.removeEventListener("beforeinstallprompt", capture); navigator.serviceWorker?.removeEventListener("controllerchange", reloadForUpdate); };
  }, []);
  const installApp = async () => {
    if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); return; }
    window.alert(lang === "th" ? "iPhone/iPad: เปิดเว็บนี้ใน Safari แล้วแตะ แชร์ → เพิ่มไปยังหน้าจอโฮม\n\nคอมพิวเตอร์/Android: เปิดด้วย Chrome หรือ Edge แล้วเลือก Install app" : "iPhone/iPad: Open this site in Safari, then tap Share → Add to Home Screen.\n\nDesktop/Android: Open in Chrome or Edge and choose Install app.");
  };
  const updateApp = async () => {
    setUpdating(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
      registration?.waiting?.postMessage("SKIP_WAITING");
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("calflow-")).map((key) => caches.delete(key)));
      }
    } finally {
      window.location.reload();
    }
  };

  return <main><div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">C</span><span>CalFlow</span></a><div className="top-actions"><button className="install-button" disabled={updating} onClick={standalone ? updateApp : installApp}>{standalone ? "↻" : "↓"} <span>{updating ? U("updating") : standalone ? U("update") : U("install")}</span></button><div className="language-switch"><button className={lang === "th" ? "active" : ""} onClick={() => setLang("th")}>TH</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div><div className="topbar-meta"><span className="live-dot" />{U("verified")}</div></div></header>
    <section className="hero" id="top"><div className="eyebrow">{U("eyebrow")}</div><h1>{U("title1")} <span>{U("title2")}</span></h1><div className="creator-credit"><span>{lang === "th" ? "ออกแบบและสร้างโดย" : "Designed & Created by"}</span><strong>Thanakrit Posa</strong></div></section>
    <nav className="module-dock">{modules.map((item) => <button key={item.id} className={active === item.id ? "module-button active" : "module-button"} onClick={() => setActive(item.id)}><span className="module-symbol">{item.symbol}</span><span><strong>{tr(item.label, lang)}</strong><small>{tr(item.short, lang)}</small></span></button>)}</nav>
    <div className="print-title"><strong>{U("report")}</strong><span>{tr(current.label, lang)}</span></div>
    {active === "general" ? <GeneralCalculators lang={lang} exportLabel={U("export")} /> : active === "scientific" ? <ScientificCalculator lang={lang} exportLabel={U("export")} /> : <section className="workspace" aria-live="polite"><div className="input-panel glass-card"><div className="panel-heading"><div><span className="section-kicker">{U("inputs")}</span><h2>{tr(current.label, lang)}</h2></div><button className="text-button no-print" onClick={() => setInputs((state) => ({ ...state, [active]: { ...defaults[active] } }))}>{U("reset")}</button></div><div className="input-grid">{active === "air" && <AirStandardFields values={inputs.air} lang={lang} onChange={(next) => setInputs((state) => ({ ...state, air: next }))}/>} {fieldConfig[active].map((field) => <label className="field" key={field.key}><span>{tr(field.label, lang)}</span><div className="field-control">{field.options ? <select aria-label={tr(field.label, lang)} value={inputs[active][field.key]} onChange={(event) => update(field.key, event.target.value)}>{field.options.map((option) => <option value={option} key={option}>{format(option, 0)}</option>)}</select> : <input aria-label={tr(field.label, lang)} type="number" step={field.step ?? 1} value={inputs[active][field.key]} onChange={(event) => update(field.key, event.target.value)} />}<em>{field.unit}</em></div></label>)}</div></div>
      <aside className="result-panel glass-card"><div className="result-header"><div><span className="section-kicker">{U("results")}</span><h2>{tr(current.label, lang)}</h2></div><span className="result-symbol">{current.symbol}</span></div><EngineeringVisual module={active} values={inputs[active]} lang={lang} /><p className="result-label">{headlineLabel}</p><div className="hero-result"><strong>{format(headlineValue, headlineDigits)}</strong><span>{headlineUnit}</span></div><div className={result.healthy ? "status-pill good" : "status-pill warning"}><i />{result.status}</div><div className="metric-list">{result.metrics.map(([label, value, unit, digits]) => <div className="metric-row" key={label}><span>{label}</span><strong>{format(value, digits)} <small>{unit}</small></strong></div>)}</div><div className="formula-card"><span>{U("formula")}</span><code>{result.formula}</code><p>{U("note")}</p></div><div className="result-actions no-print"><button className="secondary-button" onClick={copySummary}>{copied ? U("copied") : U("copy")}</button><button className="primary-button" onClick={exportPdf}>{U("export")} ↓</button></div></aside></section>}
    <section className="trust-strip"><div><strong>{lang === "th" ? "หน่วยถูกต้อง" : "Correct units"}</strong><span>SI conversion</span></div><div><strong>{lang === "th" ? "ตรวจสอบย้อนกลับ" : "Traceable logic"}</strong><span>{lang === "th" ? "แสดงสูตรในรายงาน" : "Formulas included in reports"}</span></div><div><strong>{lang === "th" ? "รองรับสองภาษา" : "Bilingual"}</strong><span>ไทย / English</span></div></section><footer><span>CalFlow Engineering Toolkit</span><span className="footer-credit">Designed & Created by <strong>Thanakrit Posa</strong> · 2026</span></footer>
  </main>;
}
