/* ============================================================
   AGRIMASTERS HR — Demo Data Generator
   Generates 350+ fictional employees + interconnected records
   Deterministic (seeded) — reproducible on reset.
   All data is clearly marked as fictional (isDemo: true) and
   can be removed without affecting real user records.
   ============================================================ */
window.ZenDemoData = (function () {
  'use strict';

  const U = window.ZenUtils;
  const S = window.ZenStore;

  // ---- Demo dictionary ----
  const ARABIC_FIRST_M = ['محمد', 'أحمد', 'محمود', 'خالد', 'مصطفى', 'عبدالله', 'يوسف', 'إبراهيم', 'عمر', 'علي', 'حسن', 'حسين', 'كريم', 'طارق', 'وليد', 'سامي', 'عماد', 'نبيل', 'فادي', 'ماجد', 'رامي', 'أيمن', 'هاني', 'شريف', 'عمرو', 'كمال', 'بهاء', 'تامر', 'زياد', 'مروان', 'أمير', 'إسلام', 'ياسر', 'فهد', 'سعود', 'بدر', 'ناصر', 'صلاح', 'مدحت', 'رجب', 'فتحي', 'سعيد', 'كثير', 'جمال', 'رفعت', 'سمير', 'أنور', 'لطفي', 'مدحت', 'حاتم', 'نادر', 'وسيم', 'هشام', 'مراد', 'فوزي', 'عاطف', 'نبيل', 'كمال', 'سيف', 'مختار'];
  const ARABIC_FIRST_F = ['فاطمة', 'مريم', 'عائشة', 'سارة', 'نورا', 'هند', 'ريم', 'ياسمين', 'دعاء', 'مريم', 'آية', 'رنا', 'لمياء', 'سلمى', 'إيمان', 'وفاء', 'هبة', 'منى', 'ليلى', 'سندس', 'بسمة', 'إكرام', 'رولا', 'دانة', 'ميرا', 'تالا', 'لينا', 'جنى', 'آلاء', 'روان', 'شهد', 'نور', 'هديل', 'ربى', 'وفاء', 'تقاء', 'أسماء', 'دنيا', 'صفا', 'إخلاص', 'غيداء', 'ميس', 'ندى', 'إصالة', 'رؤى', 'م达尔', 'حلا', 'تالة', 'يارا', 'ميساء'];
  const ARABIC_LAST = ['عبدالرحمن', 'السيد', 'إبراهيم', 'محمد', 'أحمد', 'حسن', 'علي', 'محمود', 'خالد', 'مصطفى', 'عبدالله', 'يوسف', 'عمر', 'حسين', 'كريم', 'طارق', 'وليد', 'سامي', 'عماد', 'نبيل', 'فادي', 'ماجد', 'رامي', 'أيمن', 'هاني', 'شريف', 'عمرو', 'شعبان', 'عبدالعزيز', 'الشناوي', 'البكري', 'الحديدي', 'الزهراني', 'الغريب', 'الفقي', 'النجار', 'الحداد', 'الزراع', 'السماك', 'النجار', 'الصباغ', 'العطار', 'الحلواني', 'الجندي', 'المنياوي', 'الإسكندراني', 'القاهري', 'البحيري', 'الصعيدي', 'الفيومي'];

  const EN_FIRST_M = ['Mohamed', 'Ahmed', 'Mahmoud', 'Khaled', 'Mostafa', 'Abdullah', 'Youssef', 'Ibrahim', 'Omar', 'Ali', 'Hassan', 'Hussein', 'Karim', 'Tarek', 'Waleed', 'Sami', 'Emad', 'Nabil', 'Fady', 'Maged', 'Ramy', 'Ayman', 'Hany', 'Sherif', 'Amr', 'Kamal', 'Bahaa', 'Tamer', 'Ziad', 'Marwan', 'Amir', 'Islam', 'Yasser', 'Fahd', 'Saudi', 'Badr', 'Nasser', 'Salah', 'Medhat', 'Ragab', 'Fathy', 'Said', 'Kotb', 'Jamal', 'Refat', 'Samir', 'Anwar', 'Lotfy', 'Hatem', 'Nader', 'Waseem', 'Hesham', 'Murad', 'Fawzy', 'Atef', 'Saif', 'Mokhtar'];
  const EN_FIRST_F = ['Fatma', 'Mariam', 'Aisha', 'Sara', 'Noura', 'Hind', 'Reem', 'Yasmine', 'Doaa', 'Aya', 'Rana', 'Lamia', 'Salma', 'Iman', 'Wafaa', 'Heba', 'Mona', 'Laila', 'Sundos', 'Basma', 'Ekram', 'Rola', 'Dana', 'Mira', 'Tala', 'Lina', 'Jana', 'Alaa', 'Rawan', 'Shahd', 'Noor', 'Hadeel', 'Rubai', 'Taqwa', 'Asmaa', 'Donya', 'Safa', 'Ikhlas', 'Ghada', 'Mays', 'Nada', 'Esraa', 'Roa', 'Hala', 'Tala', 'Yara', 'Maysaa'];
  const EN_LAST = ['Abdulrahman', 'El-Sayed', 'Ibrahim', 'Mohamed', 'Ahmed', 'Hassan', 'Ali', 'Mahmoud', 'Khaled', 'Mostafa', 'Abdullah', 'Youssef', 'Omar', 'Hussein', 'Karim', 'Tarek', 'Waleed', 'Sami', 'Emad', 'Nabil', 'Fady', 'Maged', 'Ramy', 'Ayman', 'Hany', 'Sherif', 'Amr', 'Shaban', 'Abdelaziz', 'El-Shennawi', 'El-Bakry', 'El-Hadidi', 'El-Zahrani', 'El-Gharib', 'El-Feky', 'El-Naggar', 'El-Haddad', 'El-Zarrai', 'El-Sammak', 'El-Sabbagh', 'El-Attar', 'El-Helwany', 'El-Gendi', 'El-Minyawi', 'Eskandarany', 'El-Cairene', 'El-Bahiri', 'El-Saidi', 'El-Fayoumi'];

  const DEPARTMENTS = [
    { id: 'dep-hr', nameAr: 'الموارد البشرية', nameEn: 'Human Resources', mgr: 'dep-hr-mgr', color: '#0f766e' },
    { id: 'dep-fin', nameAr: 'المالية والمحاسبة', nameEn: 'Finance & Accounting', mgr: 'dep-fin-mgr', color: '#1d4ed8' },
    { id: 'dep-sales', nameAr: 'المبيعات', nameEn: 'Sales', mgr: 'dep-sales-mgr', color: '#15803d' },
    { id: 'dep-mkt', nameAr: 'التسويق', nameEn: 'Marketing', mgr: 'dep-mkt-mgr', color: '#b45309' },
    { id: 'dep-wh', nameAr: 'المخازن والمخزون', nameEn: 'Warehouse & Inventory', mgr: 'dep-wh-mgr', color: '#7e22ce' },
    { id: 'dep-prod', nameAr: 'الإنتاج', nameEn: 'Production', mgr: 'dep-prod-mgr', color: '#be185d' },
    { id: 'dep-qa', nameAr: 'ضبط الجودة', nameEn: 'Quality Assurance', mgr: 'dep-qa-mgr', color: '#c2410c' },
    { id: 'dep-cs', nameAr: 'خدمة العملاء', nameEn: 'Customer Service', mgr: 'dep-cs-mgr', color: '#4338ca' },
    { id: 'dep-it', nameAr: 'تقنية المعلومات', nameEn: 'Information Technology', mgr: 'dep-it-mgr', color: '#0e7490' },
    { id: 'dep-admin', nameAr: 'الإدارة', nameEn: 'Administration', mgr: 'dep-admin-mgr', color: '#334155' },
    { id: 'dep-proc', nameAr: 'المشتريات', nameEn: 'Procurement', mgr: 'dep-proc-mgr', color: '#92400e' },
    { id: 'dep-mnt', nameAr: 'الصيانة', nameEn: 'Maintenance', mgr: 'dep-mnt-mgr', color: '#581c87' },
    { id: 'dep-ops', nameAr: 'العمليات', nameEn: 'Operations', mgr: 'dep-ops-mgr', color: '#0c4a6e' },
  ];

  const JOB_TITLES_BY_DEP = {
    'dep-hr':   [['مدير الموارد البشرية', 'HR Manager'], ['أخصائي توظيف', 'Recruitment Specialist'], ['أخصائي شؤون موظفين', 'Personnel Specialist'], ['مدرب موظفين', 'Training Officer']],
    'dep-fin':  [['المدير المالي', 'CFO'], ['محاسب أول', 'Senior Accountant'], ['محاسب', 'Accountant'], ['محاسب ضرائب', 'Tax Accountant'], ['مراقب مالي', 'Financial Controller']],
    'dep-sales':[['مدير المبيعات', 'Sales Manager'], ['مندوب مبيعات', 'Sales Representative'], ['مبيعات أول', 'Senior Sales Rep'], ['مشرف مبيعات', 'Sales Supervisor']],
    'dep-mkt':  [['مدير التسويق', 'Marketing Manager'], ['أخصائي تسويق رقمي', 'Digital Marketing Specialist'], ['مصمم جرافيك', 'Graphic Designer'], ['كاتب محتوى', 'Content Writer']],
    'dep-wh':   [['مدير المخازن', 'Warehouse Manager'], ['أمين مخزن', 'Storekeeper'], ['مشرف مخزون', 'Inventory Supervisor'], ['عامل مخزن', 'Warehouse Worker']],
    'dep-prod': [['مدير الإنتاج', 'Production Manager'], ['مشرف إنتاج', 'Production Supervisor'], ['فني تشغيل', 'Machine Operator'], ['عامل إنتاج', 'Production Worker']],
    'dep-qa':   [['مدير الجودة', 'QA Manager'], ['مفتش جودة', 'Quality Inspector'], ['مهندس جودة', 'Quality Engineer']],
    'dep-cs':   [['مدير خدمة العملاء', 'CS Manager'], ['موظف خدمة عملاء', 'CS Agent'], ['مشرف خدمة العملاء', 'CS Supervisor']],
    'dep-it':   [['مدير تقنية المعلومات', 'IT Manager'], ['مهندس شبكات', 'Network Engineer'], ['مطور برمجيات', 'Software Developer'], ['دعم فني', 'IT Support']],
    'dep-admin':[['مدير إداري', 'Admin Manager'], ['سكرتير تنفيذي', 'Executive Secretary'], ['موظف استقبال', 'Receptionist']],
    'dep-proc': [['مدير المشتريات', 'Procurement Manager'], ['أخصائي مشتريات', 'Procurement Specialist']],
    'dep-mnt':  [['مدير الصيانة', 'Maintenance Manager'], ['فني صيانة', 'Maintenance Technician'], ['مهندس صيانة', 'Maintenance Engineer']],
    'dep-ops':  [['مدير العمليات', 'Operations Manager'], ['منسق عمليات', 'Operations Coordinator'], ['محلل عمليات', 'Operations Analyst']],
  };

  const SHIFTS = [
    { id: 'shift-morning', nameAr: 'وردية صباحية', nameEn: 'Morning Shift', start: '09:00', end: '17:00', break: 60, grace: 15, days: [0, 1, 2, 3, 4] },
    { id: 'shift-evening', nameAr: 'وردية مسائية', nameEn: 'Evening Shift', start: '14:00', end: '22:00', break: 60, grace: 15, days: [0, 1, 2, 3, 4] },
    { id: 'shift-night', nameAr: 'وردية ليلية', nameEn: 'Night Shift', start: '22:00', end: '06:00', break: 60, grace: 15, days: [0, 1, 2, 3, 4, 5] },
    { id: 'shift-weekend', nameAr: 'وردية نهاية الأسبوع', nameEn: 'Weekend Shift', start: '10:00', end: '18:00', break: 60, grace: 15, days: [5, 6] },
    { id: 'shift-flex', nameAr: 'وردية مرنة', nameEn: 'Flexible Shift', start: '08:00', end: '16:00', break: 60, grace: 30, days: [0, 1, 2, 3, 4] },
  ];

  const LOCATIONS = ['المقر الرئيسي - القاهرة', 'فرع الإسكندرية', 'فرع الجيزة', 'المصنع - العاشر من رمضان', 'مستودع - 6 أكتوبر', 'فرع المنصورة', 'فرع طنطا'];
  const LOCATIONS_EN = ['HQ - Cairo', 'Alexandria Branch', 'Giza Branch', 'Factory - 10th of Ramadan', 'Warehouse - 6th of October', 'Mansoura Branch', 'Tanta Branch'];

  const STREETS = ['شارع التحرير', 'شارع الجمهورية', 'شارع النيل', 'شارع الأهرام', 'شارع صلاح سالم', 'شارع المعز', 'شارع_port Said', 'كورنيش النيل', 'شارع 9', 'شارع المطار'];
  const CITIES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'أسيوط', 'الإسماعيلية', 'الزقازيق'];

  // ---- Deterministic generation ----
  function generate() {
    const rng = U.seededRng(20261013);

    const departments = DEPARTMENTS.map((d) => ({
      id: d.id,
      name: d.nameAr,
      nameEn: d.nameEn,
      description: d.nameAr + ' — ' + d.nameEn,
      managerId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      isDemo: true,
    }));

    const shifts = SHIFTS.map((s) => ({
      id: s.id,
      name: s.nameAr,
      nameEn: s.nameEn,
      startTime: s.start,
      endTime: s.end,
      breakMinutes: s.break,
      graceMinutes: s.grace,
      workingDays: s.days,
      departmentId: null,
      active: true,
      isDemo: true,
    }));

    // ---- Generate 358 employees ----
    const employees = [];
    const TOTAL = 358;
    const now = new Date();
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Distribute employees across departments with realistic weights
    const depWeights = {
      'dep-hr': 10, 'dep-fin': 18, 'dep-sales': 50, 'dep-mkt': 22, 'dep-wh': 45,
      'dep-prod': 70, 'dep-qa': 22, 'dep-cs': 35, 'dep-it': 28, 'dep-admin': 12,
      'dep-proc': 14, 'dep-mnt': 18, 'dep-ops': 14,
    };
    const depEmployeeBuckets = {};
    Object.keys(depWeights).forEach((d) => { depEmployeeBuckets[d] = []; });

    let empCounter = 1;
    for (let i = 0; i < TOTAL; i++) {
      // Choose department
      const depId = (function () {
        let total = 0;
        for (const k in depWeights) total += depWeights[k];
        let r = rng() * total;
        for (const k in depWeights) {
          r -= depWeights[k];
          if (r <= 0) return k;
        }
        return 'dep-prod';
      })();

      const isFemale = rng() < 0.42;
      const firstAr = isFemale ? U.pick(rng, ARABIC_FIRST_F) : U.pick(rng, ARABIC_FIRST_M);
      const lastAr = U.pick(rng, ARABIC_LAST);
      const firstEn = isFemale ? U.pick(rng, EN_FIRST_F) : U.pick(rng, EN_FIRST_M);
      const lastEn = U.pick(rng, EN_LAST);

      const empId = 'EMP-' + String(empCounter).padStart(4, '0');
      empCounter++;

      // Job title based on department
      const titles = JOB_TITLES_BY_DEP[depId];
      const [titleAr, titleEn] = U.pick(rng, titles);
      const isManager = /مدير|Manager|CFO/.test(titleAr);

      // Employment type weighted
      const types = ['full_time', 'full_time', 'full_time', 'full_time', 'full_time', 'part_time', 'contract', 'intern'];
      const empType = U.pick(rng, types);

      // Hire date: spread across last 7 years, with bias toward recent
      const yearsBack = Math.floor(rng() * 7);
      const monthsBack = Math.floor(rng() * 12);
      const hireDate = new Date(now);
      hireDate.setFullYear(hireDate.getFullYear() - yearsBack);
      hireDate.setMonth(hireDate.getMonth() - monthsBack);
      hireDate.setDate(1 + Math.floor(rng() * 28));
      const hireDateStr = hireDate.toISOString().slice(0, 10);

      // 10% resigned/terminated, 5% future hire, 3% on_leave
      const statusRoll = rng();
      let empStatus = 'active';
      let endDate = null;
      if (statusRoll < 0.06) {
        empStatus = 'resigned';
        const endD = new Date(hireDate);
        endD.setFullYear(endD.getFullYear() + 1 + Math.floor(rng() * 4));
        if (endD > now) endD.setTime(now.getTime() - Math.floor(rng() * 180) * 86400000);
        endDate = endD.toISOString().slice(0, 10);
      } else if (statusRoll < 0.08) {
        empStatus = 'terminated';
        const endD = new Date(hireDate);
        endD.setFullYear(endD.getFullYear() + 1 + Math.floor(rng() * 3));
        if (endD > now) endD.setTime(now.getTime() - Math.floor(rng() * 90) * 86400000);
        endDate = endD.toISOString().slice(0, 10);
      } else if (statusRoll < 0.11) {
        empStatus = 'on_leave';
      } else if (statusRoll < 0.13) {
        empStatus = 'inactive';
      }

      // Future hire (employment starts later)
      const isFutureHire = rng() < 0.02;
      if (isFutureHire) {
        const future = new Date(now);
        future.setDate(future.getDate() + 15 + Math.floor(rng() * 60));
        hireDateStr !== undefined;
      }

      // Salary based on job level
      let baseSalary = 6000;
      if (isManager) baseSalary = U.randInt(rng, 18000, 38000);
      else if (/أول|Senior|مشرف|Supervisor|مهندس|Engineer/.test(titleAr)) baseSalary = U.randInt(rng, 12000, 22000);
      else if (/مطور|Developer|أخصائي|Specialist|محاسب|Accountant/.test(titleAr)) baseSalary = U.randInt(rng, 8000, 15000);
      else if (/عامل|Worker|فني|Technician|موظف|Agent|أمين|Storekeeper/.test(titleAr)) baseSalary = U.randInt(rng, 5000, 9000);
      else baseSalary = U.randInt(rng, 6000, 12000);

      const shiftId = U.pick(rng, SHIFTS).id;
      const locIdx = U.randInt(rng, 0, LOCATIONS.length - 1);

      // Phone (fictional)
      const phone = '010' + U.randInt(rng, 10000000, 99999999);
      const email = (firstEn.replace(/\s+/g, '.').toLowerCase() + '.' + lastEn.replace(/\s+/g, '').toLowerCase() + '@zentech.demo').substring(0, 40);
      const street = U.pick(rng, STREETS);
      const city = U.pick(rng, CITIES);

      const emp = {
        id: empId,
        name: firstAr + ' ' + lastAr,
        nameEn: firstEn + ' ' + lastEn,
        departmentId: depId,
        jobTitle: titleAr,
        jobTitleEn: titleEn,
        employmentType: empType,
        employmentStatus: empStatus,
        hireDate: hireDateStr,
        contractStart: hireDateStr,
        contractEnd: endDate || U.addDays(hireDateStr, 365 * 2),
        basicSalary: baseSalary,
        shiftId: shiftId,
        workLocation: LOCATIONS[locIdx],
        workLocationEn: LOCATIONS_EN[locIdx],
        phone: phone,
        email: email,
        address: street + '، ' + city,
        emergencyContact: U.pick(rng, ARABIC_FIRST_M) + ' ' + lastAr + ' - 010' + U.randInt(rng, 10000000, 99999999),
        notes: '',
        gender: isFemale ? 'female' : 'male',
        endDate: endDate,
        isDemo: true,
        createdAt: hireDateStr + 'T08:00:00.000Z',
        updatedAt: hireDateStr + 'T08:00:00.000Z',
      };
      employees.push(emp);
      depEmployeeBuckets[depId].push(emp);
    }

    // Assign department managers (pick first employee with "Manager" title per dept, else first in dept)
    departments.forEach((dep) => {
      const bucket = depEmployeeBuckets[dep.id] || [];
      const mgr = bucket.find((e) => /مدير|Manager|CFO/.test(e.jobTitle)) || bucket[0];
      if (mgr) dep.managerId = mgr.id;
    });

    // ---- Attendance records (last 30 working days for active employees) ----
    const attendance = [];
    const today = new Date();
    const activeEmps = employees.filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
    for (let d = 30; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().slice(0, 10);

      activeEmps.forEach((emp) => {
        // Skip if hired after this date
        if (emp.hireDate > dateStr) return;
        // Skip if not working day for shift
        const shift = shifts.find((s) => s.id === emp.shiftId);
        if (shift && !shift.workingDays.includes(dayOfWeek)) return;
        // Skip if on approved leave that day (we'll reconcile later)
        // 92% attendance rate
        const roll = rng();
        if (roll < 0.88) {
          const grace = shift ? shift.graceMinutes : 15;
          const startMin = shift ? U.timeToMinutes(shift.startTime) : 540;
          // 75% on time, 25% late
          const lateMin = roll < 0.66 ? 0 : U.randInt(rng, 1, 25);
          const checkIn = startMin + lateMin;
          const workMin = (shift ? U.diffMinutes(shift.startTime, shift.endTime) - shift.breakMinutes : 480);
          const overtime = rng() < 0.15 ? U.randInt(rng, 15, 90) : 0;
          const checkOut = checkIn + workMin + overtime;
          attendance.push({
            id: 'att-' + emp.id + '-' + dateStr,
            employeeId: emp.id,
            date: dateStr,
            checkIn: fmtTime(checkIn),
            checkOut: fmtTime(checkOut),
            status: lateMin > grace ? 'late' : 'present',
            workMinutes: workMin,
            overtimeMinutes: overtime,
            lateMinutes: lateMin,
            notes: '',
            isDemo: true,
            createdAt: dateStr + 'T08:00:00.000Z',
          });
        } else if (roll < 0.93) {
          attendance.push({
            id: 'att-' + emp.id + '-' + dateStr,
            employeeId: emp.id,
            date: dateStr,
            checkIn: null,
            checkOut: null,
            status: 'absent',
            workMinutes: 0,
            overtimeMinutes: 0,
            lateMinutes: 0,
            notes: 'غياب بدون إذن',
            isDemo: true,
            createdAt: dateStr + 'T08:00:00.000Z',
          });
        } else if (roll < 0.96) {
          attendance.push({
            id: 'att-' + emp.id + '-' + dateStr,
            employeeId: emp.id,
            date: dateStr,
            checkIn: null,
            checkOut: null,
            status: 'excused',
            workMinutes: 0,
            overtimeMinutes: 0,
            lateMinutes: 0,
            notes: 'إذن خاص',
            isDemo: true,
            createdAt: dateStr + 'T08:00:00.000Z',
          });
        } else if (roll < 0.99) {
          // remote
          attendance.push({
            id: 'att-' + emp.id + '-' + dateStr,
            employeeId: emp.id,
            date: dateStr,
            checkIn: '09:15',
            checkOut: '17:30',
            status: 'remote',
            workMinutes: 480,
            overtimeMinutes: 30,
            lateMinutes: 0,
            notes: 'عمل عن بُعد',
            isDemo: true,
            createdAt: dateStr + 'T08:00:00.000Z',
          });
        }
        // else: no record (rare)
      });
    }

    // ---- Leave requests (mix of statuses) ----
    const leaves = [];
    const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'unpaid', 'other'];
    const LEAVE_STATUSES = ['approved', 'approved', 'pending', 'rejected', 'cancelled'];
    const activeEmpsForLeaves = employees.filter((e) => e.employmentStatus !== 'resigned' && e.employmentStatus !== 'terminated');
    for (let i = 0; i < 80; i++) {
      const emp = U.pick(rng, activeEmpsForLeaves);
      const type = U.pick(rng, LEAVE_TYPES);
      // Leave in last 60 days or upcoming
      const offsetDays = U.randInt(rng, -45, 30);
      const start = new Date(today);
      start.setDate(start.getDate() + offsetDays);
      const days = type === 'sick' ? U.randInt(rng, 1, 3) : U.randInt(rng, 1, 10);
      const end = new Date(start);
      end.setDate(end.getDate() + days - 1);
      const status = U.pick(rng, LEAVE_STATUSES);
      leaves.push({
        id: 'lv-' + String(i + 1).padStart(4, '0'),
        employeeId: emp.id,
        type: type,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        days: days,
        requestDate: U.addDays(start.toISOString().slice(0, 10), -U.randInt(rng, 3, 14)),
        status: status,
        notes: type === 'sick' ? 'إجازة مرضية' : 'إجازة سنوية مخططة',
        decisionDate: status === 'pending' ? null : U.addDays(start.toISOString().slice(0, 10), -U.randInt(rng, 1, 3)),
        decisionNotes: status === 'approved' ? 'موافقة' : status === 'rejected' ? 'لا يمكن استيعاب الغياب في هذا التاريخ' : '',
        isDemo: true,
        createdAt: U.addDays(start.toISOString().slice(0, 10), -U.randInt(rng, 3, 14)) + 'T10:00:00.000Z',
      });
    }

    // ---- Payroll records (last 4 months for active employees) ----
    const payroll = [];
    const activeEmpsForPayroll = employees.filter((e) => e.employmentStatus === 'active' || e.employmentStatus === 'on_leave');
    for (let m = 4; m >= 1; m--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 15);
      const ym = monthDate.toISOString().slice(0, 7);
      activeEmpsForPayroll.forEach((emp) => {
        // Skip employees hired after this month
        if (emp.hireDate > ym + '-28') return;
        const basic = emp.basicSalary;
        // Random allowances/rewards/deductions
        const allowance = rng() < 0.5 ? U.randInt(rng, 200, 1500) : 0;
        const reward = rng() < 0.2 ? U.randInt(rng, 300, 2500) : 0;
        const overtime = rng() < 0.25 ? U.randInt(rng, 100, 1200) : 0;
        const deduction = rng() < 0.2 ? U.randInt(rng, 100, 800) : 0;
        const penalty = rng() < 0.1 ? U.randInt(rng, 50, 500) : 0;
        const insuranceEmp = Math.round(basic * (S.settings.insuranceEmployeeRate / 100));
        const tax = estimateTax(basic + allowance + reward + overtime, S.settings.taxBrackets);
        const gross = basic + allowance + reward + overtime;
        const totalDed = deduction + penalty + insuranceEmp + tax;
        const net = gross - totalDed;
        payroll.push({
          id: 'pr-' + ym + '-' + emp.id,
          employeeId: emp.id,
          period: ym,
          basicSalary: basic,
          allowances: allowance,
          rewards: reward,
          overtime: overtime,
          deductions: deduction,
          penalties: penalty,
          insuranceEmployee: insuranceEmp,
          insuranceEmployer: Math.round(basic * (S.settings.insuranceEmployerRate / 100)),
          tax: tax,
          loanInstallment: 0,
          otherAdjustments: 0,
          grossEarnings: gross,
          totalDeductions: totalDed,
          netSalary: net,
          status: m === 1 ? 'draft' : 'paid',
          paymentDate: m === 1 ? null : ym + '-28',
          notes: '',
          isDemo: true,
          createdAt: ym + '-01T00:00:00.000Z',
        });
      });
    }

    // ---- Allowances ----
    const allowances = [];
    const ALLOWANCE_TYPES = ['بدل سكن', 'بدل مواصلات', 'بدل طعام', 'بدل طبيعة عمل', 'بدل تمثيل'];
    for (let i = 0; i < 60; i++) {
      const emp = U.pick(rng, activeEmpsForPayroll);
      allowances.push({
        id: 'al-' + String(i + 1).padStart(4, '0'),
        employeeId: emp.id,
        type: U.pick(rng, ALLOWANCE_TYPES),
        amount: U.randInt(rng, 200, 1500),
        effectiveDate: U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 30, 300)),
        reason: 'بدل ثابت شهري',
        payrollPeriod: U.currentMonth(),
        status: 'active',
        notes: '',
        isDemo: true,
        createdAt: today.toISOString(),
      });
    }

    // ---- Rewards ----
    const rewards = [];
    const REWARD_TYPES = ['مكافأة أداء', 'مكافأة إنتاج', 'مكافأة حضور', 'مكافأة مشروع'];
    for (let i = 0; i < 35; i++) {
      const emp = U.pick(rng, activeEmpsForPayroll);
      rewards.push({
        id: 'rw-' + String(i + 1).padStart(4, '0'),
        employeeId: emp.id,
        type: U.pick(rng, REWARD_TYPES),
        amount: U.randInt(rng, 300, 2500),
        effectiveDate: U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 10, 90)),
        reason: 'تقدير للجهود المبذولة',
        payrollPeriod: U.currentMonth(),
        status: 'active',
        notes: '',
        isDemo: true,
        createdAt: today.toISOString(),
      });
    }

    // ---- Penalties ----
    const penalties = [];
    const PENALTY_TYPES = ['خصم تأخير', 'خصم غياب', 'جزاء مخالفة', 'إنذار'];
    for (let i = 0; i < 25; i++) {
      const emp = U.pick(rng, activeEmpsForPayroll);
      penalties.push({
        id: 'pn-' + String(i + 1).padStart(4, '0'),
        employeeId: emp.id,
        type: U.pick(rng, PENALTY_TYPES),
        amount: U.randInt(rng, 50, 500),
        effectiveDate: U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 10, 60)),
        reason: 'تأخر عن موعد العمل',
        payrollPeriod: U.currentMonth(),
        status: 'active',
        notes: '',
        isDemo: true,
        createdAt: today.toISOString(),
      });
    }

    // ---- Deductions ----
    const deductions = [];
    const DEDUCTION_TYPES = ['سلفة', 'خصم تأمين صحي', 'خصم ضرائب', 'خصم غياب'];
    for (let i = 0; i < 30; i++) {
      const emp = U.pick(rng, activeEmpsForPayroll);
      deductions.push({
        id: 'dd-' + String(i + 1).padStart(4, '0'),
        employeeId: emp.id,
        type: U.pick(rng, DEDUCTION_TYPES),
        amount: U.randInt(rng, 100, 800),
        effectiveDate: U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 10, 60)),
        reason: 'استقطاع شهري',
        payrollPeriod: U.currentMonth(),
        status: 'active',
        notes: '',
        isDemo: true,
        createdAt: today.toISOString(),
      });
    }

    // ---- Insurance records ----
    const insurance = [];
    activeEmpsForPayroll.forEach((emp) => {
      if (rng() < 0.85) {
        insurance.push({
          id: 'ins-' + emp.id,
          employeeId: emp.id,
          employeeContribution: Math.round(emp.basicSalary * (S.settings.insuranceEmployeeRate / 100)),
          employerContribution: Math.round(emp.basicSalary * (S.settings.insuranceEmployerRate / 100)),
          effectiveDate: emp.hireDate,
          notes: 'تأمين اجتماعي تجريبي',
          isDemo: true,
          createdAt: emp.hireDate + 'T00:00:00.000Z',
        });
      }
    });

    // ---- Loans ----
    const loans = [];
    for (let i = 0; i < 18; i++) {
      const emp = U.pick(rng, activeEmpsForPayroll);
      const original = U.randInt(rng, 3000, 30000);
      const installments = U.pick(rng, [6, 12, 18, 24]);
      const installmentAmount = Math.round(original / installments);
      const paid = U.randInt(rng, 0, installments);
      const remaining = original - (paid * installmentAmount);
      const reqDate = U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 100, 400));
      loans.push({
        id: 'ln-' + String(i + 1).padStart(4, '0'),
        employeeId: emp.id,
        originalAmount: original,
        requestDate: reqDate,
        approvalDate: U.addDays(reqDate, 3),
        installmentAmount: installmentAmount,
        installments: installments,
        paidInstallments: paid,
        remainingBalance: remaining,
        nextInstallmentDate: U.addDays(today.toISOString().slice(0, 10), U.randInt(rng, 5, 25)),
        status: paid >= installments ? 'completed' : 'active',
        notes: 'سلفة شخصية',
        isDemo: true,
        createdAt: reqDate + 'T00:00:00.000Z',
      });
    }

    // ---- Contracts ----
    const contracts = [];
    employees.forEach((emp) => {
      if (rng() < 0.95) {
        const start = emp.contractStart;
        // contract end could be 1-3 years from start
        const startD = new Date(start);
        const endD = new Date(startD);
        endD.setFullYear(endD.getFullYear() + U.pick(rng, [1, 2, 3]));
        contracts.push({
          id: 'ct-' + emp.id,
          employeeId: emp.id,
          type: emp.employmentType === 'contract' ? 'fixed' : 'open',
          startDate: start,
          endDate: emp.contractEnd,
          documentTitle: 'عقد عمل - ' + emp.name,
          category: 'عقد عمل',
          status: 'active',
          reminderDate: U.addDays(emp.contractEnd, -30),
          notes: '',
          isDemo: true,
          createdAt: start + 'T00:00:00.000Z',
        });
      }
    });

    // ---- Performance evaluations ----
    const performance = [];
    const CRITERIA = [
      { name: 'جودة العمل', nameEn: 'Quality of Work' },
      { name: 'الإنتاجية', nameEn: 'Productivity' },
      { name: 'العمل الجماعي', nameEn: 'Teamwork' },
      { name: 'الالتزام', nameEn: 'Commitment' },
      { name: 'المبادرة', nameEn: 'Initiative' },
    ];
    const evalEmps = employees.filter((e) => e.employmentStatus === 'active');
    for (let i = 0; i < 100; i++) {
      const emp = U.pick(rng, evalEmps);
      const period = U.pick(rng, ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1']);
      const scores = CRITERIA.map((c) => ({ name: c.name, score: U.randInt(rng, 60, 95) }));
      const overall = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
      performance.push({
        id: 'pf-' + String(i + 1).padStart(4, '0'),
        employeeId: emp.id,
        period: period,
        evaluator: 'أمير أنور',
        criteria: scores,
        overallScore: overall,
        feedback: overall > 80 ? 'أداء ممتاز مع الحفاظ على المستوى' : overall > 70 ? 'أداء جيد يحتاج بعض التحسين' : 'أداء يحتاج إلى تطوير',
        recommendations: overall > 80 ? 'ترقية' : 'خطة تطوير',
        evaluationDate: U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 30, 180)),
        followUpDate: U.addDays(today.toISOString().slice(0, 10), U.randInt(rng, 30, 90)),
        isDemo: true,
        createdAt: today.toISOString(),
      });
    }

    // ---- Recruitment vacancies & candidates ----
    const vacancies = [];
    const VACANCIES = [
      { title: 'مهندس برمجيات', dep: 'dep-it', status: 'open' },
      { title: 'محاسب', dep: 'dep-fin', status: 'open' },
      { title: 'مندوب مبيعات', dep: 'dep-sales', status: 'open' },
      { title: 'أخصائي تسويق', dep: 'dep-mkt', status: 'open' },
      { title: 'فني صيانة', dep: 'dep-mnt', status: 'closed' },
      { title: 'موظف خدمة عملاء', dep: 'dep-cs', status: 'open' },
      { title: 'أمين مخزن', dep: 'dep-wh', status: 'open' },
      { title: 'مطور واجهات', dep: 'dep-it', status: 'open' },
    ];
    VACANCIES.forEach((v, i) => {
      vacancies.push({
        id: 'vc-' + String(i + 1).padStart(4, '0'),
        jobTitle: v.title,
        departmentId: v.dep,
        status: v.status,
        openingDate: U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 10, 60)),
        closingDate: v.status === 'closed' ? U.addDays(today.toISOString().slice(0, 10), -5) : U.addDays(today.toISOString().slice(0, 10), U.randInt(rng, 10, 30)),
        isDemo: true,
        createdAt: today.toISOString(),
      });
    });

    const candidates = [];
    const STAGES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];
    for (let i = 0; i < 40; i++) {
      const v = U.pick(rng, vacancies);
      const stage = U.pick(rng, STAGES);
      const firstAr = U.pick(rng, ARABIC_FIRST_M);
      const lastAr = U.pick(rng, ARABIC_LAST);
      candidates.push({
        id: 'cd-' + String(i + 1).padStart(4, '0'),
        vacancyId: v.id,
        name: firstAr + ' ' + lastAr,
        email: firstAr.replace(/\s+/g, '.').toLowerCase() + '.candidate@example.com',
        phone: '011' + U.randInt(rng, 10000000, 99999999),
        applicationDate: U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 5, 40)),
        stage: stage,
        interviewDate: stage === 'interview' || stage === 'offer' || stage === 'hired' ? U.addDays(today.toISOString().slice(0, 10), -U.randInt(rng, 1, 10)) : null,
        interviewNotes: stage === 'interview' ? 'مقابلة أولى' : stage === 'hired' ? 'مقابلة ناجحة' : '',
        decision: stage === 'hired' ? 'تعيين' : stage === 'rejected' ? 'رفض' : 'قيد المراجعة',
        hiredEmployeeId: null,
        isDemo: true,
        createdAt: today.toISOString(),
      });
    }

    return {
      departments, shifts, employees, attendance, leaves, payroll,
      allowances, rewards, penalties, deductions, insurance, loans,
      contracts, performance, vacancies, candidates,
    };
  }

  function estimateTax(monthlyGross, brackets) {
    const annual = monthlyGross * 12;
    let tax = 0;
    let prev = 0;
    for (const b of brackets) {
      if (annual > prev) {
        const slice = Math.min(annual, b.upTo) - prev;
        tax += slice * b.rate;
        prev = b.upTo;
        if (annual <= b.upTo) break;
      } else break;
    }
    return Math.round(tax / 12);
  }

  function fmtTime(minutes) {
    minutes = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function initialize(force) {
    if (S.settings.demoInitialized && !force) return false;
    const data = generate();
    S.setCollection('departments', data.departments);
    S.setCollection('shifts', data.shifts);
    S.setCollection('employees', data.employees);
    S.setCollection('attendance', data.attendance);
    S.setCollection('leaves', data.leaves);
    S.setCollection('payroll', data.payroll);
    S.setCollection('allowances', data.allowances);
    S.setCollection('rewards', data.rewards);
    S.setCollection('penalties', data.penalties);
    S.setCollection('deductions', data.deductions);
    S.setCollection('insurance', data.insurance);
    S.setCollection('loans', data.loans);
    S.setCollection('contracts', data.contracts);
    S.setCollection('performance', data.performance);
    S.setCollection('vacancies', data.vacancies);
    S.setCollection('candidates', data.candidates);
    S.settings.demoInitialized = true;
    S.saveSettings();
    return true;
  }

  function reset() {
    S.clearAllDemo();
    return initialize(true);
  }

  function stats() {
    return {
      employees: S.count('employees'),
      departments: S.count('departments'),
      shifts: S.count('shifts'),
      attendance: S.count('attendance'),
      leaves: S.count('leaves'),
      payroll: S.count('payroll'),
      allowances: S.count('allowances'),
      rewards: S.count('rewards'),
      penalties: S.count('penalties'),
      deductions: S.count('deductions'),
      insurance: S.count('insurance'),
      loans: S.count('loans'),
      contracts: S.count('contracts'),
      performance: S.count('performance'),
      vacancies: S.count('vacancies'),
      candidates: S.count('candidates'),
    };
  }

  return { generate, initialize, reset, stats };
})();
