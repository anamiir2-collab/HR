/* ============================================================
   ZenHR — Internationalization (Arabic / English)
   ============================================================ */
window.ZenI18n = (function () {
  'use strict';

  let lang = localStorage.getItem('agrimasters:lang') || 'ar';

  const dict = {
    // ---- App ----
    'app.tagline': { ar: 'إدارة الموارد البشرية', en: 'Human Resources' },
    'app.mainWorkspace': { ar: 'مساحة العمل الرئيسية', en: 'Main Workspace' },
    'footer.tagline': { ar: 'صُمم بعناية لإدارة فريقك', en: 'Crafted to manage your team' },
    'role.admin': { ar: 'مدير النظام', en: 'System Administrator' },
    'nav.home': { ar: 'الرئيسية', en: 'Home' },

    // ---- Gate ----
    'gate.subtitle': { ar: 'نظام إدارة الموارد البشرية', en: 'Human Resources Management' },
    'gate.password': { ar: 'رمز الدخول', en: 'Access Code' },
    'gate.hint': { ar: 'رمز افتراضي: <code>admin</code> — للإشارة فقط، وليس حماية أمنية فعلية.', en: 'Default code: <code>admin</code> — convenience only, not real security.' },
    'gate.enter': { ar: 'دخول', en: 'Sign In' },
    'gate.note': { ar: 'بياناتك محفوظة محليًا على هذا الجهاز فقط.', en: 'Your data is stored locally on this device only.' },

    // ---- Nav ----
    'dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
    'employees': { ar: 'الموظفون', en: 'Employees' },
    'attendance': { ar: 'الحضور والانصراف', en: 'Attendance' },
    'leaves': { ar: 'الإجازات', en: 'Leaves' },
    'payroll': { ar: 'المرتبات والأجور', en: 'Payroll' },
    'rewards': { ar: 'الحوافز والمكافآت', en: 'Rewards' },
    'allowances': { ar: 'البدلات', en: 'Allowances' },
    'penalties': { ar: 'الجزاءات', en: 'Penalties' },
    'deductions': { ar: 'الخصومات والاستقطاعات', en: 'Deductions' },
    'insurance': { ar: 'التأمينات الاجتماعية', en: 'Insurance' },
    'loans': { ar: 'السلف والقروض', en: 'Loans & Advances' },
    'contracts': { ar: 'العقود والمستندات', en: 'Contracts' },
    'departments': { ar: 'الأقسام والإدارات', en: 'Departments' },
    'shifts': { ar: 'الورديات', en: 'Shifts' },
    'performance': { ar: 'تقييم الأداء', en: 'Performance' },
    'recruitment': { ar: 'التوظيف', en: 'Recruitment' },
    'reports': { ar: 'التقارير', en: 'Reports' },
    'settings': { ar: 'الإعدادات', en: 'Settings' },
    'centralSettings': { ar: 'إعدادات الرواتب والورديات', en: 'Payroll & Shift Settings' },
    // AGRIMASTERS HR v2 — new module labels
    'fingerprint': { ar: 'البصمة واستيراد الحضور', en: 'Fingerprint Import' },
    'disciplinary': { ar: 'الجزاءات والتأديب', en: 'Disciplinary Actions' },
    'offboarding': { ar: 'إنهاء الخدمة', en: 'Offboarding' },
    'documents': { ar: 'المستندات والوثائق', en: 'Documents' },
    'audit': { ar: 'سجل التدقيق', en: 'Audit Trail' },
    'training': { ar: 'التدريب', en: 'Training' },
    'organization': { ar: 'الهيكل التنظيمي', en: 'Organization' },
    'branches': { ar: 'الفروع', en: 'Branches' },
    'sections': { ar: 'الأقسام الفرعية', en: 'Sections' },
    'jobTitles': { ar: 'المسميات الوظيفية', en: 'Job Titles' },
    'jobGrades': { ar: 'الدرجات الوظيفية', en: 'Job Grades' },
    'costCenters': { ar: 'مراكز التكلفة', en: 'Cost Centers' },
    'workLocations': { ar: 'مواقع العمل', en: 'Work Locations' },

    // ---- Common ----
    'common.search': { ar: 'بحث', en: 'Search' },
    'common.filter': { ar: 'تصفية', en: 'Filter' },
    'common.add': { ar: 'إضافة', en: 'Add' },
    'common.edit': { ar: 'تعديل', en: 'Edit' },
    'common.delete': { ar: 'حذف', en: 'Delete' },
    'common.archive': { ar: 'أرشفة', en: 'Archive' },
    'common.save': { ar: 'حفظ', en: 'Save' },
    'common.cancel': { ar: 'إلغاء', en: 'Cancel' },
    'common.confirm': { ar: 'تأكيد', en: 'Confirm' },
    'common.close': { ar: 'إغلاق', en: 'Close' },
    'common.export': { ar: 'تصدير', en: 'Export' },
    'common.print': { ar: 'طباعة', en: 'Print' },
    'common.view': { ar: 'عرض', en: 'View' },
    'common.actions': { ar: 'إجراءات', en: 'Actions' },
    'common.all': { ar: 'الكل', en: 'All' },
    'common.none': { ar: 'لا يوجد', en: 'None' },
    'common.loading': { ar: 'جارٍ التحميل...', en: 'Loading...' },
    'common.empty': { ar: 'لا توجد سجلات', en: 'No records found' },
    'common.required': { ar: 'حقل مطلوب', en: 'Required field' },
    'common.invalid': { ar: 'قيمة غير صالحة', en: 'Invalid value' },
    'common.yes': { ar: 'نعم', en: 'Yes' },
    'common.no': { ar: 'لا', en: 'No' },
    'common.total': { ar: 'الإجمالي', en: 'Total' },
    'common.name': { ar: 'الاسم', en: 'Name' },
    'common.status': { ar: 'الحالة', en: 'Status' },
    'common.date': { ar: 'التاريخ', en: 'Date' },
    'common.amount': { ar: 'المبلغ', en: 'Amount' },
    'common.notes': { ar: 'ملاحظات', en: 'Notes' },
    'common.reason': { ar: 'السبب', en: 'Reason' },
    'common.type': { ar: 'النوع', en: 'Type' },
    'common.department': { ar: 'القسم', en: 'Department' },
    'common.employee': { ar: 'الموظف', en: 'Employee' },
    'common.created': { ar: 'تاريخ الإنشاء', en: 'Created' },

    // ---- Statuses ----
    'status.active': { ar: 'نشط', en: 'Active' },
    'status.on_leave': { ar: 'في إجازة', en: 'On Leave' },
    'status.inactive': { ar: 'غير نشط', en: 'Inactive' },
    'status.resigned': { ar: 'مستقيل', en: 'Resigned' },
    'status.terminated': { ar: 'منتهي الخدمة', en: 'Terminated' },
    'status.pending': { ar: 'قيد المراجعة', en: 'Pending' },
    'status.approved': { ar: 'موافق عليه', en: 'Approved' },
    'status.rejected': { ar: 'مرفوض', en: 'Rejected' },
    'status.cancelled': { ar: 'ملغي', en: 'Cancelled' },
    'status.present': { ar: 'حاضر', en: 'Present' },
    'status.late': { ar: 'متأخر', en: 'Late' },
    'status.absent': { ar: 'غائب', en: 'Absent' },
    'status.excused': { ar: 'غياب بعذر', en: 'Excused' },
    'status.remote': { ar: 'عن بُعد', en: 'Remote' },
    'status.processed': { ar: 'تمت المعالجة', en: 'Processed' },
    'status.paid': { ar: 'مدفوع', en: 'Paid' },
    'status.draft': { ar: 'مسودة', en: 'Draft' },
    'status.completed': { ar: 'مكتمل', en: 'Completed' },

    // ---- Employment ----
    'emp.full_time': { ar: 'دوام كامل', en: 'Full-time' },
    'emp.part_time': { ar: 'دوام جزئي', en: 'Part-time' },
    'emp.contract': { ar: 'تعاقد', en: 'Contract' },
    'emp.intern': { ar: 'متدرب', en: 'Intern' },
    'emp.id': { ar: 'الرقم الوظيفي', en: 'Employee ID' },
    'emp.fullName': { ar: 'الاسم الكامل', en: 'Full Name' },
    'emp.jobTitle': { ar: 'المسمى الوظيفي', en: 'Job Title' },
    'emp.basicSalary': { ar: 'الراتب الأساسي', en: 'Basic Salary' },
    'emp.hireDate': { ar: 'تاريخ التعيين', en: 'Hire Date' },
    'emp.phone': { ar: 'الهاتف', en: 'Phone' },
    'emp.email': { ar: 'البريد', en: 'Email' },
    'emp.manager': { ar: 'المسؤول المباشر', en: 'Manager' },
    'emp.shift': { ar: 'الوردية', en: 'Shift' },
    'emp.location': { ar: 'موقع العمل', en: 'Work Location' },
    'emp.employmentType': { ar: 'نوع التوظيف', en: 'Employment Type' },
    'emp.employmentStatus': { ar: 'حالة التوظيف', en: 'Employment Status' },
    'emp.contractStart': { ar: 'بداية العقد', en: 'Contract Start' },
    'emp.contractEnd': { ar: 'نهاية العقد', en: 'Contract End' },
    'emp.address': { ar: 'العنوان', en: 'Address' },
    'emp.emergency': { ar: 'جهة الاتصال الطارئة', en: 'Emergency Contact' },

    // ---- Leave ----
    'leave.annual': { ar: 'إجازة سنوية', en: 'Annual Leave' },
    'leave.sick': { ar: 'إجازة مرضية', en: 'Sick Leave' },
    'leave.emergency': { ar: 'إجازة طارئة', en: 'Emergency Leave' },
    'leave.unpaid': { ar: 'إجازة بدون أجر', en: 'Unpaid Leave' },
    'leave.other': { ar: 'أخرى', en: 'Other' },
    'leave.startDate': { ar: 'تاريخ البداية', en: 'Start Date' },
    'leave.endDate': { ar: 'تاريخ النهاية', en: 'End Date' },
    'leave.days': { ar: 'عدد الأيام', en: 'Days' },
    'leave.requestDate': { ar: 'تاريخ الطلب', en: 'Request Date' },
    'leave.decisionDate': { ar: 'تاريخ القرار', en: 'Decision Date' },
    'leave.decisionNotes': { ar: 'ملاحظات القرار', en: 'Decision Notes' },

    // ---- Notifications ----
    'notifications.title': { ar: 'الإشعارات', en: 'Notifications' },
    'notifications.empty': { ar: 'لا توجد إشعارات حالياً', en: 'No notifications' },

    // ---- Settings ----
    'settings.language': { ar: 'اللغة', en: 'Language' },
    'settings.currency': { ar: 'العملة', en: 'Currency' },
    'settings.company': { ar: 'بيانات الشركة', en: 'Company' },
    'settings.companyName': { ar: 'اسم الشركة', en: 'Company Name' },
    'settings.demoData': { ar: 'إدارة البيانات التجريبية', en: 'Demo Data Management' },
    'settings.backup': { ar: 'النسخ الاحتياطي والاستعادة', en: 'Backup & Restore' },
    'settings.rules': { ar: 'القواعد والسياسات', en: 'Rules & Policies' },
  };

  function t(key, fallback) {
    const e = dict[key];
    if (!e) return fallback || key;
    return e[lang] || e.ar || key;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      el.textContent = t(k);
    });
  }

  function setLang(l) {
    if (l !== 'ar' && l !== 'en') return;
    lang = l;
    localStorage.setItem('agrimasters:lang', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    apply();
    if (window.ZenApp && typeof ZenApp.onLangChange === 'function') {
      ZenApp.onLangChange(l);
    }
    document.dispatchEvent(new CustomEvent('agrimasters:lang-change', { detail: { lang: l } }));
  }

  function toggle() {
    setLang(lang === 'ar' ? 'en' : 'ar');
  }

  function init() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  init();

  return { t, apply, setLang, toggle, get current() { return lang; }, get lang() { return lang; } };
})();
