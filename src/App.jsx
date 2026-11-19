import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Calendar, Award, User, LogOut, CheckCircle, AlertCircle, 
  Search, Lock, ShieldAlert, Cpu, Settings, Check, Filter, Building, Loader2, Shuffle, Users
} from 'lucide-react';

const DEPARTMENTS = [
  { id: 'FL', name: '應外系', fullName: '應用外語系' },
  { id: 'CS', name: '資工系', fullName: '資訊工程系' },
  { id: 'EE', name: '電機系', fullName: '電機工程系' },
  { id: 'BA', name: '企管系', fullName: '企業管理系' }
];

const GRADUATION_REQUIREMENTS = {
  deptRequired: 40,
  deptElective: 30,
  generalEdu: 28,
  totalRequired: 128
};

export default function App() {
  // 已註冊的本地帳號庫（支援多帳號切換測試）
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('tat_registered_users');
      return saved ? JSON.parse(saved) : [
        { studentId: 'B11317001', password: '123', name: '陳柏翰', dept: '應外系' },
        { studentId: 'B11315002', password: '123', name: '林資工', dept: '資工系' }
      ];
    } catch {
      return [];
    }
  });

  // 當前登入使用者
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tat_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 課程資料狀態
  const [courses, setCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Admin 控制台狀態（控制加選階段與科系分流）
  const [systemPhase, setSystemPhase] = useState(1); // 1: 第一次加選, 2: 第二次加選
  const [isTrafficThrottled, setIsTrafficThrottled] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // 照科系分流排隊 Modal 狀態
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueNumber, setQueueNumber] = useState(0);
  const [pendingCourse, setPendingCourse] = useState(null);

  // 依帳號區分的選課清單
  const [selectedCoursesMap, setSelectedCoursesMap] = useState(() => {
    try {
      const saved = localStorage.getItem('tat_selected_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const selectedCourses = currentUser ? (selectedCoursesMap[currentUser.studentId] || []) : [];

  const [activeTab, setActiveTab] = useState('courses');
  const [mainCategoryTab, setMainCategoryTab] = useState('DEPT'); // 'DEPT' | 'GEN' | 'ALL_SCHOOL'
  const [selectedSubDept, setSelectedSubDept] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  // 登入/註冊表單
  const [loginForm, setLoginForm] = useState({ studentId: '', password: '', name: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  // 讀取 public/courses.json
  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoadingCourses(true);
        const res = await fetch('/courses.json');
        if (!res.ok) throw new Error('無法讀取 courses.json');
        const data = await res.json();
        setCourses(data);
      } catch (err) {
        console.error(err);
        showToast('讀取 public/courses.json 失敗，請確認檔案位置與 JSON 格式', 'error');
      } finally {
        setIsLoadingCourses(false);
      }
    }
    fetchCourses();
  }, []);

  // 同步儲存至 localStorage
  useEffect(() => {
    localStorage.setItem('tat_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tat_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('tat_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('tat_selected_map', JSON.stringify(selectedCoursesMap));
  }, [selectedCoursesMap]);

  // 科系分流排隊倒數
  useEffect(() => {
    let timer;
    if (isQueueing && queueNumber > 0) {
      timer = setInterval(() => {
        setQueueNumber((prev) => prev - 1);
      }, 650);
    } else if (isQueueing && queueNumber === 0) {
      if (pendingCourse && currentUser) {
        setSelectedCoursesMap((prev) => ({
          ...prev,
          [currentUser.studentId]: [...(prev[currentUser.studentId] || []), pendingCourse.id]
        }));
        showToast(`【${pendingCourse.dept}分流節點通過】成功加選「${pendingCourse.title}」！`, 'success');
        setPendingCourse(null);
      }
      setIsQueueing(false);
    }
    return () => clearInterval(timer);
  }, [isQueueing, queueNumber, pendingCourse, currentUser]);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // 登入與隨機分配系所註冊
  const handleAuth = (e) => {
    e.preventDefault();
    const id = loginForm.studentId.trim();
    const pwd = loginForm.password.trim();

    if (!id || !pwd) {
      showToast('請輸入學號與密碼', 'error');
      return;
    }

    if (isRegistering) {
      if (registeredUsers.some((u) => u.studentId === id)) {
        showToast('此學號已註冊，請直接登入', 'error');
        return;
      }
      // 隨機分配系所給剛註冊的用戶
      const randomDept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
      const newUser = {
        studentId: id,
        password: pwd,
        name: loginForm.name.trim() || `測試生_${id.slice(-3)}`,
        dept: randomDept.name
      };
      setRegisteredUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      setMainCategoryTab('DEPT');
      showToast(`註冊成功！系統已隨機分配您至【${randomDept.fullName} (${randomDept.name})】`, 'success');
    } else {
      const found = registeredUsers.find((u) => u.studentId === id && u.password === pwd);
      if (!found) {
        showToast('帳號或密碼錯誤（若未註冊請點下方快速註冊）', 'error');
        return;
      }
      setCurrentUser(found);
      setMainCategoryTab('DEPT');
      showToast(`歡迎回來，${found.name}（${found.dept}）！`, 'success');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('已安全登出', 'info');
  };

  // 加選課程檢核
  const handleSelectCourse = (course) => {
    // 第一次加選階段鎖定臺大系統課程
    if (systemPhase === 1 && course.isNtuSystem) {
      showToast('【第一次加選限制】臺大/師大系統課程目前僅供瀏覽，第二次加選開放選取！', 'error');
      return;
    }

    if (selectedCourses.includes(course.id)) {
      showToast('此課程已在您的課表中', 'warning');
      return;
    }

    // 衝堂檢查
    const currentList = courses.filter((c) => selectedCourses.includes(c.id));
    const conflict = currentList.find((c) => {
      if (c.timeSlot?.day !== course.timeSlot?.day) return false;
      return !(c.timeSlot.end < course.timeSlot.start || c.timeSlot.start > course.timeSlot.end);
    });

    if (conflict) {
      showToast(`【衝堂警告】與已選課程「${conflict.title}」時間重疊！`, 'error');
      return;
    }

    // 照科系分流排隊模擬
    if (isTrafficThrottled) {
      setPendingCourse(course);
      // 熱門系所或通識模擬較多排隊人數
      const baseQueue = course.category === 'GEN' || course.deptId === 'CS' ? 6 : 3;
      setQueueNumber(Math.floor(Math.random() * 4) + baseQueue);
      setIsQueueing(true);
    } else {
      setSelectedCoursesMap((prev) => ({
        ...prev,
        [currentUser.studentId]: [...selectedCourses, course.id]
      }));
      showToast(`成功加選「${course.title}」！`, 'success');
    }
  };

  const handleDropCourse = (courseId) => {
    setSelectedCoursesMap((prev) => ({
      ...prev,
      [currentUser.studentId]: selectedCourses.filter((id) => id !== courseId)
    }));
    showToast('已退選該課程', 'info');
  };

  // 畢業學分計算機
  const calculateCredits = () => {
    // 模擬該生過去學期已修畢的基礎學分
    const completedDeptReq = 18;
    const completedDeptEle = 9;
    const completedGen = 10;

    const currentList = courses.filter((c) => selectedCourses.includes(c.id));
    let pendingDeptReq = 0;
    let pendingDeptEle = 0;
    let pendingGen = 0;
    let pendingOther = 0;

    currentList.forEach((c) => {
      if (c.dept === currentUser?.dept && c.type === '系必修') {
        pendingDeptReq += c.credits;
      } else if (c.dept === currentUser?.dept && c.type === '系選修') {
        pendingDeptEle += c.credits;
      } else if (c.category === 'GEN') {
        pendingGen += c.credits;
      } else {
        // 外系選修或臺大系統課計入自由/外系選修學分
        pendingOther += c.credits;
      }
    });

    const totalCurrent = completedDeptReq + completedDeptEle + completedGen + pendingDeptReq + pendingDeptEle + pendingGen + pendingOther;

    return {
      deptReq: { done: completedDeptReq, pending: pendingDeptReq, target: GRADUATION_REQUIREMENTS.deptRequired },
      deptEle: { done: completedDeptEle, pending: pendingDeptEle + pendingOther, target: GRADUATION_REQUIREMENTS.deptElective },
      genEdu: { done: completedGen, pending: pendingGen, target: GRADUATION_REQUIREMENTS.generalEdu },
      total: { current: totalCurrent, target: GRADUATION_REQUIREMENTS.totalRequired }
    };
  };

  const creditStats = calculateCredits();

// 三大分類與科系動態過濾
  const filteredCourses = courses.filter((course) => {
    if (!currentUser) return false; // 👈 加上這行：未登入時直接略過，不讀取 dept

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      course.title.toLowerCase().includes(term) ||
      course.code.toLowerCase().includes(term) ||
      course.teacher.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    // 1. 用戶科系可選課：嚴格比對登入者的科系
    if (mainCategoryTab === 'DEPT') {
      return course.dept === currentUser?.dept; // 👈 加上 ?. 雙重保險
    }

    // 2. 通識課程
    if (mainCategoryTab === 'GEN') {
      return course.category === 'GEN';
    }

    // 3. 全校課程
    if (mainCategoryTab === 'ALL_SCHOOL') {
      if (course.category === 'GEN') return false;
      if (selectedSubDept === 'ALL') return true;
      return course.deptId === selectedSubDept;
    }

    return true;
  });

  // 未登入畫面
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800">
          <div className="flex items-center justify-center mb-4 gap-3">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-600/30">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-white">TAT Ultra Max</h1>
              <p className="text-xs text-blue-400 font-medium">NTUST 雙系統整合選課平台</p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 mt-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">學號</label>
              <input
                type="text"
                placeholder="例如: B11317001"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                value={loginForm.studentId}
                onChange={(e) => setLoginForm({ ...loginForm, studentId: e.target.value })}
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">姓名（選填）</label>
                <input
                  type="text"
                  placeholder="輸入您的姓名"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  value={loginForm.name}
                  onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">密碼</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>

            {isRegistering && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2 text-xs text-blue-300">
                <Shuffle className="w-4 h-4 shrink-0 text-blue-400" />
                <span>為方便多系所測試，註冊後系統將<strong>隨機分配系所</strong>（應外/資工/電機/企管）。</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition shadow-lg shadow-blue-600/30"
            >
              {isRegistering ? '註冊並隨機分配系所' : '登入系統'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-slate-300 hover:text-white underline font-medium"
            >
              {isRegistering ? '已有帳號？返回登入' : '註冊新帳號（隨機分系）'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLoginForm({ studentId: 'B11317001', password: '123', name: '' })}
                className="text-blue-400 hover:text-blue-300"
              >
                測試應外
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setLoginForm({ studentId: 'B11315002', password: '123', name: '' })}
                className="text-emerald-400 hover:text-emerald-300"
              >
                測試資工
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast 提示 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md transition-all ${
          notification.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' :
          notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200' :
          'bg-blue-500/20 border-blue-500/50 text-blue-200'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* 頂部導覽列 */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-600/30">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-wider text-white">TAT Ultra Max</h1>
              <span className="text-xs text-slate-400">查課選課一體化 ‧ 科系分流 ‧ 學分精算</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              systemPhase === 1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>
              <Lock className="w-3.5 h-3.5" />
              <span>{systemPhase === 1 ? '第一次加選（鎖定臺大系統）' : '第二次加選（全面開放）'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cpu className="w-3.5 h-3.5" />
              <span>{isTrafficThrottled ? `分流節點：${currentUser.dept}專屬通道` : '分流保護：關閉'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-200 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <User className="w-4 h-4 text-blue-400" />
              <span>{currentUser.name}</span>
              <span className="px-2 py-0.5 text-xs rounded bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold">
                {currentUser.dept}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800 transition"
              title="登出"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-2 border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'courses' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" /> 雙系統整合查加選
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'schedule' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" /> 個人即時課表 ({selectedCourses.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'audit' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" /> 距離畢業學分計算
          </button>
        </div>

        {/* 分頁一：雙系統整合查加選 */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            {/* 三大課程分類按鈕 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setMainCategoryTab('DEPT')}
                className={`p-4 rounded-xl border font-bold text-left flex items-center justify-between transition ${
                  mainCategoryTab === 'DEPT'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-base">1. 用戶科系可選課</div>
                  <div className="text-xs font-normal text-slate-400 mt-1">
                    僅顯示「{currentUser.dept}」專屬課程
                  </div>
                </div>
                <User className="w-5 h-5 text-blue-400" />
              </button>

              <button
                onClick={() => setMainCategoryTab('GEN')}
                className={`p-4 rounded-xl border font-bold text-left flex items-center justify-between transition ${
                  mainCategoryTab === 'GEN'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-base">2. 通識課程</div>
                  <div className="text-xs font-normal text-slate-400 mt-1">人文、社會與自然思維向度</div>
                </div>
                <BookOpen className="w-5 h-5 text-blue-400" />
              </button>

              <button
                onClick={() => setMainCategoryTab('ALL_SCHOOL')}
                className={`p-4 rounded-xl border font-bold text-left flex items-center justify-between transition ${
                  mainCategoryTab === 'ALL_SCHOOL'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-lg shadow-purple-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-base">3. 全校課程</div>
                  <div className="text-xs font-normal text-slate-400 mt-1">依科系與三校聯盟分類查詢</div>
                </div>
                <Building className="w-5 h-5 text-purple-400" />
              </button>
            </div>

            {/* 全校課程下的科系次篩選器 */}
            {mainCategoryTab === 'ALL_SCHOOL' && (
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-purple-900/40 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-purple-300 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> 選擇開課系所：
                </span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'ALL', label: '全部系所' },
                    { id: 'FL', label: '應外系' },
                    { id: 'CS', label: '資工系' },
                    { id: 'EE', label: '電機系' },
                    { id: 'BA', label: '企管系' },
                    { id: 'NTU', label: '臺大系統' },
                    { id: 'NTNU', label: '師大系統' }
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubDept(sub.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                        selectedSubDept === sub.id
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 搜尋框 */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="直接輸入課名、課碼或教師姓名（查完直接一鍵加選，無需跳轉系統）..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* 第一次加選階段提示橫幅 */}
            {systemPhase === 1 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3 text-amber-200 text-xs">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">【第一次加選階段規則】</span> 凡屬「臺大/師大三校聯盟系統」之課程，目前<strong>可瀏覽課表資訊但鎖定加選按鈕</strong>；請於右下角 Demo 控制台切換至「第二次加選」即可開放選取。
                </div>
              </div>
            )}

            {/* 課程卡片列表 */}
            {isLoadingCourses ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <p className="text-sm">正在載入課程資料...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-16 text-slate-500 border border-slate-800 border-dashed rounded-xl">
                找不到符合條件的課程
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course) => {
                  const isSelected = selectedCourses.includes(course.id);
                  const isLocked = systemPhase === 1 && course.isNtuSystem;

                  return (
                    <div
                      key={course.id}
                      className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition hover:border-slate-700 ${
                        course.isNtuSystem ? 'border-purple-900/60 bg-gradient-to-br from-slate-900 to-purple-950/20' : 'border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {course.code}
                          </span>
                          {course.isNtuSystem ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              臺大系統課程
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {course.type}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-lg text-white mb-1">{course.title}</h3>
                        <p className="text-xs text-slate-400 mb-4">{course.dept} ‧ {course.teacher}</p>

                        <div className="space-y-1.5 text-xs text-slate-300 mb-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{course.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="w-3.5 h-3.5 text-slate-500" />
                            <span>{course.credits} 學分</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => (isSelected ? handleDropCourse(course.id) : handleSelectCourse(course))}
                        className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
                          isSelected
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                            : isLocked
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                        }`}
                      >
                        {isSelected ? (
                          <>已加入課表（點擊退選）</>
                        ) : isLocked ? (
                          <><Lock className="w-4 h-4" /> 一階段僅供瀏覽（不可選）</>
                        ) : (
                          <><Check className="w-4 h-4" /> 一鍵加選</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 分頁二：視覺化課表 */}
        {activeTab === 'schedule' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" /> {currentUser.name}（{currentUser.dept}）的預排課表
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400">
                    <th className="py-3 px-2 w-16">節次</th>
                    <th className="py-3 px-4">週一</th>
                    <th className="py-3 px-4">週二</th>
                    <th className="py-3 px-4">週三</th>
                    <th className="py-3 px-4">週四</th>
                    <th className="py-3 px-4">週五</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) => (
                    <tr key={slot} className="hover:bg-slate-800/30">
                      <td className="py-3 font-mono text-xs text-slate-500 bg-slate-950">第 {slot} 節</td>
                      {[1, 2, 3, 4, 5].map((day) => {
                        const matched = courses
                          .filter((c) => selectedCourses.includes(c.id))
                          .find((c) => c.timeSlot?.day === day && slot >= c.timeSlot.start && slot <= c.timeSlot.end);

                        return (
                          <td key={day} className="py-2 px-2 h-16 border-l border-slate-800/50">
                            {matched ? (
                              <div className="bg-blue-600/20 border border-blue-500/40 p-2 rounded-lg text-xs font-medium text-blue-200 h-full flex flex-col justify-center">
                                <div className="font-bold truncate">{matched.title}</div>
                                <div className="text-[10px] text-blue-300/70">{matched.dept} ‧ {matched.teacher}</div>
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 分頁三：距離畢業學分計算 */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-400" /> 距離畢業學分精算儀表板（{currentUser.dept}標準）
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              即時整合「歷年已取得學分」與「本學期預選學分」，自動計算距離畢業門檻還差多少學分。
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-300">畢業總學分進度</span>
                <span className="text-xl font-mono font-bold text-blue-400">
                  {creditStats.total.current} / {creditStats.total.target} 學分
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (creditStats.total.current / creditStats.total.target) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-3">
                距離 128 畢業學分門檻，目前尚缺 <span className="text-amber-400 font-bold text-sm">{Math.max(0, creditStats.total.target - creditStats.total.current)}</span> 學分。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">系定必修</h4>
                <div className="text-2xl font-bold text-white mb-2">
                  {creditStats.deptReq.done + creditStats.deptReq.pending} <span className="text-xs text-slate-500 font-normal">/ {creditStats.deptReq.target}</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>已修畢：{creditStats.deptReq.done} 學分</div>
                  <div className="text-blue-400">本學期加選：+{creditStats.deptReq.pending} 學分</div>
                  <div className="text-amber-400/90 pt-1">尚缺：{Math.max(0, creditStats.deptReq.target - (creditStats.deptReq.done + creditStats.deptReq.pending))} 學分</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">系定與自由選修</h4>
                <div className="text-2xl font-bold text-white mb-2">
                  {creditStats.deptEle.done + creditStats.deptEle.pending} <span className="text-xs text-slate-500 font-normal">/ {creditStats.deptEle.target}</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>已修畢：{creditStats.deptEle.done} 學分</div>
                  <div className="text-blue-400">本學期加選：+{creditStats.deptEle.pending} 學分</div>
                  <div className="text-amber-400/90 pt-1">尚缺：{Math.max(0, creditStats.deptEle.target - (creditStats.deptEle.done + creditStats.deptEle.pending))} 學分</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">通識課程</h4>
                <div className="text-2xl font-bold text-white mb-2">
                  {creditStats.genEdu.done + creditStats.genEdu.pending} <span className="text-xs text-slate-500 font-normal">/ {creditStats.genEdu.target}</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>已修畢：{creditStats.genEdu.done} 學分</div>
                  <div className="text-blue-400">本學期加選：+{creditStats.genEdu.pending} 學分</div>
                  <div className="text-amber-400/90 pt-1">尚缺：{Math.max(0, creditStats.genEdu.target - (creditStats.genEdu.done + creditStats.genEdu.pending))} 學分</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 照科系分流排隊 Modal */}
      {isQueueing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/50 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/30">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">科系獨立伺服器分流中</h3>
              <p className="text-xs text-slate-400 mt-1">
                已導向至【<span className="text-blue-400 font-semibold">{pendingCourse?.dept}</span>】專屬選課通道，避免全校流量壅塞...
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">該科系通道前方排隊人數</div>
              <div className="text-4xl font-black font-mono text-blue-400 my-1">{queueNumber} 人</div>
              <div className="text-[10px] text-slate-500">預估處理時間：約 {queueNumber} 秒</div>
            </div>

            <div className="text-xs text-slate-400">
              正在寫入課程：<span className="text-white font-bold">{pendingCourse?.title}</span>
            </div>
          </div>
        </div>
      )}

      {/* 右下角 Demo 示範控制台按鈕 */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowAdminModal(true)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold transition"
        >
          <Settings className="w-4 h-4 text-blue-400" />
          <span>Demo 示範控制台</span>
        </button>
      </div>

      {/* Admin Demo 控制台 Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" /> 上台報告 Demo 控制面板
              </h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            {!isAdminUnlocked ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  請輸入演示密碼 <code className="text-blue-400 font-mono">admin</code> 解鎖控制台：
                </p>
                <input
                  type="password"
                  placeholder="輸入 admin..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (adminPassword === 'admin') {
                      setIsAdminUnlocked(true);
                      showToast('解鎖 Demo 面板成功', 'success');
                    } else {
                      showToast('密碼錯誤（密碼為 admin）', 'error');
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold"
                >
                  解鎖面板
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-300">選課階段切換（三校聯盟權限）</span>
                    <button
                      onClick={() => {
                        const nextPhase = systemPhase === 1 ? 2 : 1;
                        setSystemPhase(nextPhase);
                        showToast(`已切換為：${nextPhase === 1 ? '第一次加選（鎖定臺大系統課）' : '第二次加選（開放臺大系統課）'}`, 'info');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      切為 {systemPhase === 1 ? '第二次加選' : '第一次加選'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    目前狀態：<span className="text-blue-400 font-bold">{systemPhase === 1 ? '第一次加選（臺大系統課僅供瀏覽）' : '第二次加選（臺大系統課可加選）'}</span>
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-300">照科系分流保護模擬</span>
                    <button
                      onClick={() => {
                        setIsTrafficThrottled(!isTrafficThrottled);
                        showToast(`科系分流排隊模擬已${!isTrafficThrottled ? '開啟' : '關閉'}`, 'info');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isTrafficThrottled ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isTrafficThrottled ? '已啟用（顯示科系分流排隊）' : '已關閉（直接秒選）'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> 已註冊測試帳號一覽（點擊快速切換）
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {registeredUsers.map((u) => (
                      <button
                        key={u.studentId}
                        onClick={() => {
                          setCurrentUser(u);
                          setMainCategoryTab('DEPT');
                          setShowAdminModal(false);
                          showToast(`已切換身分為：${u.name}（${u.dept}）`, 'info');
                        }}
                        className={`px-2.5 py-1 rounded text-xs border transition ${
                          currentUser.studentId === u.studentId
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {u.studentId} ({u.dept})
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowAdminModal(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs"
                >
                  關閉控制面板
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}