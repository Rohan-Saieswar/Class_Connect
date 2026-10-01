export type Language = "en" | "te" | "hi";

export interface Translations {
  // Navigation & Branding
  navDashboard: string;
  navFeed: string;
  navAnnouncements: string;
  navAcademics: string;
  navTimetable: string;
  navAssignments: string;
  navExams: string;
  navResources: string;
  navQuestions: string;
  navCalendar: string;
  navRequests: string;
  navPolls: string;
  navDirectory: string;
  navAdmin: string;
  navSystemAdmin: string;
  navToday: string;
  navSettings: string;
  navKnowledgeBase: string;
  navChannels: string;

  // Actions
  actionSearch: string;
  actionSwitchWorkspace: string;
  actionCreatePost: string;
  actionNewAnnouncement: string;
  actionAskQuestion: string;
  actionSubmitRequest: string;
  actionCreatePoll: string;
  actionUploadResource: string;
  actionAddExam: string;
  actionImportStudents: string;
  actionApprove: string;
  actionReject: string;
  actionSave: string;
  actionCancel: string;
  actionFilter: string;
  actionShare: string;
  actionGenerateQR: string;
  actionBookmark: string;

  // Headings & Labels
  headingOverview: string;
  headingNextClass: string;
  headingTodaySchedule: string;
  headingDeadlines: string;
  headingRecentAnnouncements: string;
  headingClassFeed: string;
  headingAcademicQA: string;
  headingResourceLibrary: string;
  headingStudentTickets: string;
  headingActivePolls: string;
  headingMembersDirectory: string;

  // Statuses
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
  statusResolved: string;
  statusInProgress: string;
  statusArchived: string;
  statusActive: string;

  // Roles
  roleStudent: string;
  roleCR: string;
  roleFaculty: string;
  roleAdmin: string;

  // Common UI
  labelSubject: string;
  labelFaculty: string;
  labelRoom: string;
  labelTime: string;
  labelDate: string;
  labelDue: string;
  labelCategory: string;
  labelPriority: string;
  labelSolved: string;
  labelUnsolved: string;
  emptyState: string;
  themeToggle: string;
  languageSelect: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    navDashboard: "Dashboard",
    navFeed: "Class Feed",
    navAnnouncements: "Announcements",
    navAcademics: "Subjects",
    navTimetable: "Timetable",
    navAssignments: "Assignments",
    navExams: "Examinations",
    navResources: "Resources",
    navQuestions: "Academic Q&A",
    navCalendar: "Calendar",
    navRequests: "Class Requests",
    navPolls: "Polls",
    navDirectory: "Directory",
    navAdmin: "CR Admin",
    navSystemAdmin: "System Admin",
    navToday: "Today",
    navSettings: "Settings",
    navKnowledgeBase: "Guides & FAQ",
    navChannels: "Channels",

    actionSearch: "Search workspace (Ctrl+K)...",
    actionSwitchWorkspace: "Switch Workspace",
    actionCreatePost: "Create Post",
    actionNewAnnouncement: "New Announcement",
    actionAskQuestion: "Ask Question",
    actionSubmitRequest: "Submit Request",
    actionCreatePoll: "Create Poll",
    actionUploadResource: "Upload Resource",
    actionAddExam: "Add Examination",
    actionImportStudents: "Import Students CSV",
    actionApprove: "Approve",
    actionReject: "Reject",
    actionSave: "Save Changes",
    actionCancel: "Cancel",
    actionFilter: "Filter",
    actionShare: "Share",
    actionGenerateQR: "Project QR Code",
    actionBookmark: "Bookmark",

    headingOverview: "Class Overview",
    headingNextClass: "Next Class",
    headingTodaySchedule: "Today's Timetable",
    headingDeadlines: "Upcoming Deadlines",
    headingRecentAnnouncements: "Recent Announcements",
    headingClassFeed: "Class Community Feed",
    headingAcademicQA: "Academic Doubt Clearance",
    headingResourceLibrary: "Subject Material & Notes",
    headingStudentTickets: "Student Grievance & Requests",
    headingActivePolls: "Active Class Polls",
    headingMembersDirectory: "Class Directory",

    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusResolved: "Resolved",
    statusInProgress: "In Progress",
    statusArchived: "Archived",
    statusActive: "Active",

    roleStudent: "Student",
    roleCR: "Class Representative",
    roleFaculty: "Faculty",
    roleAdmin: "System Administrator",

    labelSubject: "Subject",
    labelFaculty: "Faculty",
    labelRoom: "Room",
    labelTime: "Time",
    labelDate: "Date",
    labelDue: "Due",
    labelCategory: "Category",
    labelPriority: "Priority",
    labelSolved: "Solved",
    labelUnsolved: "Unsolved",
    emptyState: "No items found in this section.",
    themeToggle: "Toggle Theme",
    languageSelect: "Language",
  },
  te: {
    navDashboard: "డాష్‌బోర్డ్",
    navFeed: "తరగతి ఫీడ్",
    navAnnouncements: "ప్రకటనలు",
    navAcademics: "విషయాలు",
    navTimetable: "సమయ పట్టిక",
    navAssignments: "అసైన్‌మెంట్లు",
    navExams: "పరీక్షలు",
    navResources: "వనరులు",
    navQuestions: "ప్రశ్నలు & సమాధానాలు",
    navCalendar: "క్యాలెండర్",
    navRequests: "తరగతి అభ్యర్థనలు",
    navPolls: "పోల్స్",
    navDirectory: "డైరెక్టరీ",
    navAdmin: "CR నిర్వహణ",
    navSystemAdmin: "సిస్టమ్ అడ్మిన్",
    navToday: "ఈ రోజు",
    navSettings: "సెట్టింగులు",
    navKnowledgeBase: "మార్గదర్శకాలు",
    navChannels: "ఛానెల్స్",

    actionSearch: "వెతకండి (Ctrl+K)...",
    actionSwitchWorkspace: "వర్క్‌స్పేస్ మార్చండి",
    actionCreatePost: "పోస్ట్ సృష్టించండి",
    actionNewAnnouncement: "కొత్త ప్రకటన",
    actionAskQuestion: "సందేహం అడగండి",
    actionSubmitRequest: "అభ్యర్థన పంపండి",
    actionCreatePoll: "పోల్ సృష్టించండి",
    actionUploadResource: "వనరును అప్‌లోడ్ చేయండి",
    actionAddExam: "పరీక్ష చేర్చండి",
    actionImportStudents: "విద్యార్థులను దిగుమతి చేయండి",
    actionApprove: "ఆమోదించు",
    actionReject: "తిరస్కరించు",
    actionSave: "భద్రపరచు",
    actionCancel: "రద్దు చేయి",
    actionFilter: "ఫిల్టర్",
    actionShare: "పంచుకోండి",
    actionGenerateQR: "QR కోడ్ చూపించండి",
    actionBookmark: "బుక్‌మార్క్",

    headingOverview: "తరగతి అవలోకనం",
    headingNextClass: "తదుపరి క్లాస్",
    headingTodaySchedule: "ఈనాటి సమయ పట్టిక",
    headingDeadlines: "రాబోయే గడువులు",
    headingRecentAnnouncements: "తాజా ప్రకటనలు",
    headingClassFeed: "తరగతి ఫీడ్",
    headingAcademicQA: "విద్యా సందేహాలు",
    headingResourceLibrary: "పాఠ్య సామగ్రి",
    headingStudentTickets: "విద్యార్థుల అభ్యర్థనలు",
    headingActivePolls: "ప్రస్తుత పోల్స్",
    headingMembersDirectory: "సభ్యుల వివరాలు",

    statusPending: "వేచి ఉంది",
    statusApproved: "ఆమోదించబడింది",
    statusRejected: "తిరస్కరించబడింది",
    statusResolved: "పరిష్కరించబడింది",
    statusInProgress: "పురోగతిలో ఉంది",
    statusArchived: "ఆర్కైవ్ చేయబడింది",
    statusActive: "క్రియాశీలకంగా ఉంది",

    roleStudent: "విద్యార్థి",
    roleCR: "క్లాస్ రిప్రజెంటేటివ్ (CR)",
    roleFaculty: "అధ్యాపకులు",
    roleAdmin: "సిస్టమ్ నిర్వాహకుడు",

    labelSubject: "విషయం",
    labelFaculty: "అధ్యాపకులు",
    labelRoom: "గది",
    labelTime: "సమయం",
    labelDate: "తేదీ",
    labelDue: "గడువు",
    labelCategory: "వర్గం",
    labelPriority: "ప్రాధాన్యత",
    labelSolved: "పరిష్కారమైనది",
    labelUnsolved: "పరిష్కారం కాలేదు",
    emptyState: "ఎటువంటి అంశాలు లేవు.",
    themeToggle: "థీమ్ మార్చండి",
    languageSelect: "భాష",
  },
  hi: {
    navDashboard: "डैशबोर्ड",
    navFeed: "कक्षा फ़ीड",
    navAnnouncements: "घोषणाएँ",
    navAcademics: "विषय",
    navTimetable: "समय सारिणी",
    navAssignments: "असाइनमेंट",
    navExams: "परीक्षाएं",
    navResources: "अध्ययन सामग्री",
    navQuestions: "अकादमिक प्रश्नोत्तर",
    navCalendar: "कैलेंडर",
    navRequests: "कक्षा अनुरोध",
    navPolls: "मतदान (Polls)",
    navDirectory: "निर्देशिका",
    navAdmin: "CR प्रशासन",
    navSystemAdmin: "सिस्टम व्यवस्थापक",
    navToday: "आज",
    navSettings: "सेटिंग्स",
    navKnowledgeBase: "मार्गदर्शिका एवं अक्सर पूछे जाने वाले प्रश्न",
    navChannels: "चैनल्स",

    actionSearch: "खोजें (Ctrl+K)...",
    actionSwitchWorkspace: "कार्यक्षेत्र बदलें",
    actionCreatePost: "पोस्ट बनाएं",
    actionNewAnnouncement: "नई घोषणा",
    actionAskQuestion: "प्रश्न पूछें",
    actionSubmitRequest: "अनुरोध भेजें",
    actionCreatePoll: "मतदान बनाएं",
    actionUploadResource: "सामग्री अपलोड करें",
    actionAddExam: "परीक्षा जोड़ें",
    actionImportStudents: "छात्र आयात करें (CSV)",
    actionApprove: "स्वीकृत करें",
    actionReject: "अस्वीकृत करें",
    actionSave: "सुरक्षित करें",
    actionCancel: "रद्द करें",
    actionFilter: "फ़िल्टर",
    actionShare: "साझा करें",
    actionGenerateQR: "QR कोड दिखाएं",
    actionBookmark: "बुकमार्क",

    headingOverview: "कक्षा अवलोकन",
    headingNextClass: "अगली कक्षा",
    headingTodaySchedule: "आज की समय सारिणी",
    headingDeadlines: "आगामी समय सीमा",
    headingRecentAnnouncements: "हाल की घोषणाएं",
    headingClassFeed: "कक्षा फ़ीड",
    headingAcademicQA: "अकादमिक शंका समाधान",
    headingResourceLibrary: "अध्ययन संसाधन व नोट्स",
    headingStudentTickets: "छात्र अनुरोध व शिकायतें",
    headingActivePolls: "सक्रिय मतदान",
    headingMembersDirectory: "कक्षा निर्देशिका",

    statusPending: "लंबित",
    statusApproved: "स्वीकृत",
    statusRejected: "अस्वीकृत",
    statusResolved: "समाधानित",
    statusInProgress: "प्रगति में",
    statusArchived: "संग्रहीत",
    statusActive: "सक्रिय",

    roleStudent: "विद्यार्थी",
    roleCR: "कक्षा प्रतिनिधि (CR)",
    roleFaculty: "संकाय (Faculty)",
    roleAdmin: "सिस्टम एडमिनिस्ट्रेटर",

    labelSubject: "विषय",
    labelFaculty: "संकाय",
    labelRoom: "कक्ष",
    labelTime: "समय",
    labelDate: "दिनांक",
    labelDue: "अंतिम तिथि",
    labelCategory: "श्रेणी",
    labelPriority: "प्राथमिकता",
    labelSolved: "हल किया हुआ",
    labelUnsolved: "अनसुलझा",
    emptyState: "कोई आइटम नहीं मिला।",
    themeToggle: "थीम बदलें",
    languageSelect: "भाषा",
  },
};

export function getTranslation(lang: Language = "en"): Translations {
  return translations[lang] || translations.en;
}
