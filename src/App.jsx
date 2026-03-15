import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Search, Plus, Package, X, Activity, Zap, Droplets, Wand2,
    Flame, PieChart, Download, Upload, ArrowLeftRight, Hash, Scale, Beef,
    Filter, ShoppingCart, Tag, ChevronDown, Trash2, Camera, Image as ImageIcon,
    CheckCircle2, RotateCcw, Layers, MessageSquare, Send, UserCog, List, RefreshCw, Sparkles,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Loader2, Maximize2, Settings, Moon, Sun, Folder,
    CheckSquare, LayoutGrid, TableProperties, MoreVertical, Settings2, ChevronUp
} from 'lucide-react';

// --- Local Storage Database Mock (Firebase API Shim) ---
const serverTimestamp = () => ({ seconds: Math.floor(Date.now() / 1000) });

const getAuth = () => ({});
const signInAnonymously = async () => ({ user: { uid: 'local-user' } });
const signInWithCustomToken = async () => ({ user: { uid: 'local-user' } });
const onAuthStateChanged = (auth, cb) => {
    cb({ uid: 'local-user' });
    return () => { };
};

const getFirestore = () => ({});
const collection = (db, ...paths) => paths.join('/');
const doc = (db, ...paths) => paths.join('/');

const getStorage = () => JSON.parse(localStorage.getItem('nutripricr_db') || '[]');
const saveStorage = (data) => {
    localStorage.setItem('nutripricr_db', JSON.stringify(data));
    window.dispatchEvent(new Event('db_updated'));
};

const onSnapshot = (col, callback) => {
    const notify = () => callback({ docs: getStorage().map(e => ({ id: e.id, data: () => e })) });
    notify();
    window.addEventListener('db_updated', notify);
    return () => window.removeEventListener('db_updated', notify);
};

const addDoc = async (col, data) => {
    const storage = getStorage();
    const newId = crypto.randomUUID();
    storage.push({ id: newId, ...data });
    saveStorage(storage);
};

const updateDoc = async (id, data) => {
    const storage = getStorage();
    const index = storage.findIndex(e => e.id === id);
    if (index > -1) {
        storage[index] = { ...storage[index], ...data };
        saveStorage(storage);
    }
};

const deleteDoc = async (id) => {
    const storage = getStorage();
    const newStorage = storage.filter(e => e.id !== id);
    saveStorage(newStorage);
};

const setDoc = async (id, data) => {
    const storage = getStorage();
    const index = storage.findIndex(e => e.id === id);
    if (index > -1) {
        storage[index] = { id, ...data };
    } else {
        storage.push({ id, ...data });
    }
    saveStorage(storage);
};

const app = {};
const auth = getAuth();
const db = getFirestore();

const PERSISTENT_APP_ID = import.meta.env.VITE_APP_ID || 'nutripricer_v1_stable';
const UNIT_CONVERSIONS = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ml: 1, l: 1000, ct: 1, scoop: 1, piece: 1, bar: 1 };

const STANDARD_CATEGORIES = [
    'Meat & Seafood', 'Dairy & Eggs', 'Produce', 'Pantry & Dry Goods',
    'Snacks & Sweets', 'Frozen', 'Beverages', 'Supplements',
    'Cleaning', 'Personal Care', 'Paper Goods', 'Pet Supplies', 'Other'
];

const CHANGELOG = [
    { version: "1.0.5", date: "March 12, 2026", notes: ["Added price per kg and per lb display metrics.", "Improved text wrapping on desktop for better readability."] },
    { version: "1.0.4", date: "March 2026", notes: ["Added explicit error handling for invalid API keys.", "Added API Status checker in Settings.", "Added Version History modal."] },
    { version: "1.0.3", date: "March 2026", notes: ["Secured Gemini API Key to local browser storage to prevent GitHub Pages leaks."] },
    { version: "1.0.2", date: "March 2026", notes: ["Resolved Node build conflicts and enforced standard Vite configuration."] },
    { version: "1.0.1", date: "February 2026", notes: ["Migrated single HTML app wrapper to fully-fledged React and Vite build system.", "Mocked out Firebase dependencies with localStorage APIs."] }
];

const MEAT_DATABASE = {
    'chicken breast': { protein: 31, fats: 3.6, carbs: 0, calories: 165, category: 'Meat & Seafood' },
    'chicken thigh': { protein: 26, fats: 10.9, carbs: 0, calories: 209, category: 'Meat & Seafood' },
    'ground beef': { protein: 26, fats: 15, carbs: 0, calories: 250, category: 'Meat & Seafood' },
    'steak': { protein: 25, fats: 19, carbs: 0, calories: 271, category: 'Meat & Seafood' },
    'salmon': { protein: 20, fats: 13, carbs: 0, calories: 208, category: 'Meat & Seafood' },
    'pork chop': { protein: 27, fats: 14, carbs: 0, calories: 242, category: 'Meat & Seafood' },
    'eggs': { protein: 13, fats: 11, carbs: 1.1, calories: 155, servingSize: 100, unit: 'ct', weight: 50, category: 'Dairy & Eggs' }
};

const STORE_ALIASES = {
    'no[\\s\\-]*frills': 'No Frills', 'loblaws?': 'Loblaws', 'real canadian superstore|superstore|rcss': 'Superstore',
    'sobeys': 'Sobeys', 'metro': 'Metro', 'freshco': 'FreshCo', 'food[\\s\\-]*basics': 'Food Basics',
    'zehrs': 'Zehrs', 'fortinos': 'Fortinos', 't[\\s\\&a-z]*t': 'T&T', 'farm[\\s\\-]*boy': 'Farm Boy',
    'walmart': 'Walmart', 'costco': 'Costco', 'amazon': 'Amazon', 'shoppers(?:\\s*drug\\s*mart)?': 'Shoppers',
    'rexall': 'Rexall', 'giant[\\s\\-]*tiger': 'Giant Tiger'
};

export default function App() {
    // --- Dark Mode State ---
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('nutripricer_theme') === 'dark';
        }
        return false;
    });

    useEffect(() => {
        localStorage.setItem('nutripricer_theme', isDarkMode ? 'dark' : 'light');
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // --- Theme Variables ---
    const theme = {
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        surface: isDarkMode ? 'bg-slate-900' : 'bg-white',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        text: isDarkMode ? 'text-slate-100' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        inputBg: isDarkMode ? 'bg-slate-800' : 'bg-slate-50',
        inputFocus: isDarkMode ? 'focus:bg-slate-700' : 'focus:bg-white',
        btnMuted: isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200',
        cardHover: isDarkMode ? 'hover:border-slate-700 hover:bg-slate-800/50' : 'hover:border-slate-300 hover:shadow-md',
        blueAccentBg: isDarkMode ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-100',
        blueAccentText: isDarkMode ? 'text-blue-400' : 'text-blue-700',
    };

    const [user, setUser] = useState(null);
    const [entries, setEntries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);
    const [sortBy, setSortBy] = useState('date');
    const [displayMetric, setDisplayMetric] = useState('unit');
    const [granularity, setGranularity] = useState(100);
    const [activeTab, setActiveTab] = useState('food');
    const [selectedStore, setSelectedStore] = useState('All Stores');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [loading, setLoading] = useState(true);
    // const [compareIds, setCompareIds] = useState([]); // Removed in favor of selectedIds


    // --- Layout & View States ---
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('nutripricer_viewMode') || 'grid';
        return 'grid';
    });
    const [showImages, setShowImages] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('nutripricer_showImages') !== 'false';
        return true;
    });

    useEffect(() => {
        localStorage.setItem('nutripricer_viewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('nutripricer_showImages', showImages);
    }, [showImages]);

    // --- Selection Mode States (Consolidated) ---
    const [selectedIds, setSelectedIds] = useState([]);
    const [categorizationQueue, setCategorizationQueue] = useState([]);

    // --- New Feature States ---
    const [batchQueue, setBatchQueue] = useState([]);
    const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
    const [isCropping, setIsCropping] = useState(false);
    const [cropState, setCropState] = useState({ scale: 1, rotate: 0, x: 0, y: 0 });
    const [scanProposal, setScanProposal] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    // --- Safe Confirmation State ---
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null, hideCancel: false });

    const [macroOptions, setMacroOptions] = useState([]);
    const [showMacroPicker, setShowMacroPicker] = useState(false);
    const [macroRefinement, setMacroRefinement] = useState('');
    const [macroContext, setMacroContext] = useState('editor');

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');

    // --- Settings & Persona State ---
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [userPersona, setUserPersona] = useState("Femur-dominant lifter. Exceptional ankle dorsiflexion but high spinal/gluteal shearing during squats. Need precise high-protein/calorie recovery fuel.");
    const [tempPersona, setTempPersona] = useState('');
    const [showPersonaSettings, setShowPersonaSettings] = useState(false);

    const [geminiApiKey, setGeminiApiKey] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('nutripricer_gemini_key') || '';
        }
        return '';
    });
    const [tempApiKey, setTempApiKey] = useState('');
    const [showApiSettings, setShowApiSettings] = useState(false);
    const [apiStatus, setApiStatus] = useState('idle');
    const [showChangelog, setShowChangelog] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [showCompareView, setShowCompareView] = useState(false);
    const [showBulkActionMenu, setShowBulkActionMenu] = useState(false);
    const [showDetailView, setShowDetailView] = useState(false);
    const [selectedDetailItem, setSelectedDetailItem] = useState(null);
    const [tableSort, setTableSort] = useState({ key: 'date', direction: 'desc' });
    const [visibleColumns, setVisibleColumns] = useState(['name', 'store', 'total', 'unitPrice', 'pro']);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    const chatEndRef = useRef(null);

    const defaultForm = {
        rawText: '', name: '', store: '', price: '', originalPrice: '', quantity: '1', weight: '',
        unit: 'g', servingSize: '100', servingUnit: 'g', protein: '', carbs: '', fats: '', calories: '',
        category: 'Other', isSale: false, isNonFood: false, image: null
    };
    const [formData, setFormData] = useState(defaultForm);
    const [oldServingSize, setOldServingSize] = useState('100');
    const [batchOldServingSize, setBatchOldServingSize] = useState('100');

    const testApiKey = async (key) => {
        if (!key || !key.trim()) { setApiStatus('invalid'); return; }
        setApiStatus('testing');
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`);
            setApiStatus(response.ok ? 'valid' : 'invalid');
        } catch (err) {
            setApiStatus('invalid');
        }
    };

    // --- Safe AI Helper with Strict Schema Enforcement ---
    const callGemini = async (prompt, systemPrompt = "You are an AI.", imageDataBase64 = null, expectedSchema = null) => {
        if (!geminiApiKey) {
            setConfirmDialog({ isOpen: true, message: "Gemini API Key is missing. Please add it in the Settings menu.", hideCancel: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
            return null;
        }
        let retries = 0;
        while (retries <= 5) {
            try {
                const parts = [{ text: prompt }];
                if (imageDataBase64) {
                    parts.push({ inlineData: { mimeType: "image/jpeg", data: imageDataBase64.split(',')[1] } });
                }

                const payload = {
                    contents: [{ role: "user", parts }],
                    systemInstruction: { parts: [{ text: `${systemPrompt} Context: ${userPersona}` }] },
                    generationConfig: { responseMimeType: "application/json" }
                };

                if (expectedSchema) {
                    payload.generationConfig.responseSchema = expectedSchema;
                }

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Gemini API Error:", response.status, errorText);
                    if (response.status === 400 && errorText.includes("API_KEY_INVALID")) {
                        setConfirmDialog({ isOpen: true, message: "Invalid API Key. Please verify the key in Settings.", hideCancel: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
                        return null;
                    }
                    throw new Error('API request failed');
                }
                const result = JSON.parse(await response.text());

                let textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                textResponse = textResponse.replace(new RegExp('```json', 'gi'), '').replace(new RegExp('```', 'g'), '').trim();
                return JSON.parse(textResponse);
            } catch (err) {
                if (retries === 5) return null;
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
                retries++;
            }
        }
    };

    // --- DB Context Generator for AI ---
    const buildAIContext = useCallback(() => {
        const recent = [...entries].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);

        const bestPro = [...entries].filter(e => !e.isNonFood).sort((a, b) => {
            const getYield = (item) => {
                const price = parseFloat(item.price) || 0;
                if (price <= 0) return 0;
                const totalW = (parseFloat(item.weight) || 0) * (UNIT_CONVERSIONS[item.unit] || 1) * (parseFloat(item.quantity) || 1);
                const serv = parseFloat(item.servingSize) || 100;
                const pro = parseFloat(item.protein) || 0;
                return ((totalW / serv) * pro) / price;
            };
            return getYield(b) - getYield(a);
        }).slice(0, 3);

        return JSON.stringify({
            recentAdditions: recent.map(e => `${e.name} at ${e.store} for $${e.price}`),
            topProteinDeals: bestPro.map(e => `${e.name} at ${e.store}`)
        });
    }, [entries]);

    // --- Chat Initiation Effect ---
    useEffect(() => {
        if (isChatOpen && chatMessages.length === 0) {
            const initGreeting = async () => {
                setAiLoading(true);
                try {
                    const dbContext = buildAIContext();
                    const prompt = `Generate a very brief, friendly opening message (1-2 sentences). Mention something specific from my DB context: ${dbContext}. Keep it conversational and helpful. DO NOT wrap the response in markdown.`;

                    if (!geminiApiKey) throw new Error("No API Key");

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: prompt }] }],
                            systemInstruction: { parts: [{ text: `You are NutriPricer Coach. Context: ${userPersona}` }] }
                        })
                    });
                    const result = await response.json();
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        setChatMessages([{ role: 'model', text: text.replace(new RegExp('```json', 'gi'), '').replace(new RegExp('```', 'g'), '').trim() }]);
                    }
                } catch (e) {
                    setChatMessages([{ role: 'model', text: "Hello! I'm your NutriPricer coach. How can I help you optimize your grocery list today?" }]);
                }
                setAiLoading(false);
            };
            initGreeting();
        }
    }, [isChatOpen, chatMessages.length, buildAIContext, userPersona]);

    // --- Batch Image Workflow ---
    const handleBatchSelection = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const readers = files.map(file => new Promise(resolve => {
            const r = new FileReader();
            r.onload = ev => resolve({ raw: ev.target.result, cropped: null });
            r.readAsDataURL(file);
        }));
        Promise.all(readers).then(res => {
            setBatchQueue(res);
            setCurrentQueueIndex(0);
            setCropState({ scale: 1, rotate: 0, x: 0, y: 0 });
            setIsCropping(true);
        });
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    const applyCropAndMove = async () => {
        setAiLoading(true);
        await new Promise(resolve => setTimeout(resolve, 50));

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = batchQueue[currentQueueIndex].raw;
        await img.decode();

        const size = 800;
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);

        ctx.translate(size / 2 + (cropState.x / 100) * size, size / 2 + (cropState.y / 100) * size);
        ctx.scale(cropState.scale, cropState.scale);
        ctx.rotate((cropState.rotate * Math.PI) / 180);

        const aspect = img.width / img.height;
        let drawW = size;
        let drawH = size / aspect;
        if (drawH < size) { drawH = size; drawW = size * aspect; }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

        const croppedData = canvas.toDataURL('image/jpeg', 0.8);
        const updatedQueue = [...batchQueue];
        updatedQueue[currentQueueIndex].cropped = croppedData;
        setBatchQueue(updatedQueue);

        if (currentQueueIndex < batchQueue.length - 1) {
            setCurrentQueueIndex(currentQueueIndex + 1);
            setCropState({ scale: 1, rotate: 0, x: 0, y: 0 });
            setAiLoading(false);
        } else {
            setIsCropping(false);
            setCurrentQueueIndex(0);
            analyzeBatchItem(0, updatedQueue);
        }
    };

    const analyzeBatchItem = async (index, queue) => {
        setAiLoading(true);
        const item = queue[index];

        const ocrSchema = {
            type: "OBJECT",
            properties: {
                name: { type: "STRING" },
                price: { type: "NUMBER" },
                isSale: { type: "BOOLEAN" },
                originalPrice: { type: "NUMBER" },
                weight: { type: "NUMBER" },
                quantity: { type: "NUMBER" },
                unit: { type: "STRING" },
                store: { type: "STRING" },
                category: { type: "STRING", description: "Categorize into: Meat & Seafood, Dairy & Eggs, Produce, Pantry & Dry Goods, Snacks & Sweets, Frozen, Beverages, Supplements, Cleaning, Personal Care, Paper Goods, Pet Supplies, or Other" },
                isNonFood: { type: "BOOLEAN" },
                protein: { type: "NUMBER" },
                carbs: { type: "NUMBER" },
                fats: { type: "NUMBER" },
                calories: { type: "NUMBER" },
                servingSize: { type: "NUMBER" },
                servingUnit: { type: "STRING" }
            }
        };

        const prompt = `Extract grocery details from this image. 
    1. CATEGORY: Accurately assess if this is food or non-food (isNonFood). Assign a specific 'category' string from standard grocery aisles.
    2. MULTI-PACKS: Crucially assess if this is a multi-pack. For example: "4 packs of 250ct napkins" -> quantity=4, weight=250, unit='ct'. "2 x 2L milk" -> quantity=2, weight=2, unit='l'.
    3. SALES: Identify if the item is on sale (isSale). If so, extract the sale price into 'price' and the regular/old price into 'originalPrice'.
    4. MACROS: If it is food and a nutrition label is visible, extract macros PER SERVING. If NO label is visible but it is a food product you can identify (e.g., 'Greek Yogurt', 'Ground Beef', 'Chicken'), automatically search your knowledge and PRE-FILL the estimated standard macros per serving. DO NOT extract macros for non-food items.
    5. SERVING SIZE: NEVER use 'kg' or 'l' as a serving unit. A serving of chocolate is typically 30g-50g, NOT 1.3kg! Default to 100g if unclear.
    Normalize all units. Return ONLY JSON.`;

        const data = await callGemini(prompt, "OCR & Nutrition Expert", item.cropped, ocrSchema);

        setAiLoading(false);

        if (data && (data.name || data.price)) {
            let sSize = data.servingSize?.toString() || '100';
            let sUnit = (data.servingUnit || data.unit || 'g').toLowerCase();

            if (sUnit === 'kg') { sSize = (parseFloat(sSize) * 1000).toString(); sUnit = 'g'; }
            if (sUnit === 'l') { sSize = (parseFloat(sSize) * 1000).toString(); sUnit = 'ml'; }
            if (parseFloat(sSize) > 500 && ['g', 'ml'].includes(sUnit)) {
                sSize = '100';
            }

            setScanProposal({
                ...data,
                image: item.cropped,
                category: data.category || 'Other',
                isNonFood: !!data.isNonFood,
                isSale: !!data.isSale,
                originalPrice: data.originalPrice?.toString() || '',
                protein: data.protein || '',
                carbs: data.carbs || '',
                fats: data.fats || '',
                calories: data.calories || '',
                servingSize: sSize,
                servingUnit: sUnit
            });
            setBatchOldServingSize(sSize);
        } else {
            setConfirmDialog({
                isOpen: true,
                message: `Failed to extract readable text for item ${index + 1}. Ensure the label and price are centered.`,
                hideCancel: true,
                onConfirm: () => {
                    setConfirmDialog({ isOpen: false });
                    handleNextAfterConfirm(index, queue);
                }
            });
        }
    };

    const acceptScanProposal = async () => {
        if (!user) return;

        const mappedData = {
            name: scanProposal.name || "",
            price: scanProposal.price?.toString() || "",
            isSale: !!scanProposal.isSale,
            originalPrice: scanProposal.originalPrice?.toString() || "",
            weight: scanProposal.weight?.toString() || "",
            unit: scanProposal.unit?.toLowerCase() || "g",
            quantity: scanProposal.quantity?.toString() || "1",
            store: scanProposal.store || "",
            category: scanProposal.category || "Other",
            image: scanProposal.image,
            isNonFood: !!scanProposal.isNonFood,
            protein: scanProposal.protein?.toString() || "",
            carbs: scanProposal.carbs?.toString() || "",
            fats: scanProposal.fats?.toString() || "",
            calories: scanProposal.calories?.toString() || "",
            servingSize: scanProposal.servingSize?.toString() || "100",
            servingUnit: scanProposal.servingUnit || "g",
        };

        if (batchQueue.length === 1) {
            setFormData(prev => ({ ...prev, ...mappedData }));
            setScanProposal(null);
            setBatchQueue([]);
            setIsDrawerOpen(true);
        } else {
            const newItem = { ...defaultForm, ...mappedData, createdAt: serverTimestamp() };
            await addDoc(collection(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices'), newItem);
            handleNextAfterConfirm(currentQueueIndex, batchQueue);
        }
    };

    const discardScanProposal = () => {
        if (batchQueue.length === 1) {
            setScanProposal(null);
            setBatchQueue([]);
        } else {
            handleNextAfterConfirm(currentQueueIndex, batchQueue);
        }
    };

    const handleNextAfterConfirm = (index, queue) => {
        setScanProposal(null);
        if (index < queue.length - 1) {
            setCurrentQueueIndex(index + 1);
            analyzeBatchItem(index + 1, queue);
        } else {
            setBatchQueue([]);
            setConfirmDialog({
                isOpen: true,
                message: "Batch processing queue complete!",
                hideCancel: true,
                onConfirm: () => setConfirmDialog({ isOpen: false })
            });
        }
    };

    // --- Proportional Scaling ---
    const handleServingFocus = (e) => {
        e.target.dataset.oldValue = e.target.value;
    };

    const handleServingBlur = (e) => {
        const isBatch = macroContext === 'batch';
        const oldSize = parseFloat(e.target.dataset.oldValue);
        const newSize = parseFloat(e.target.value);

        const targetState = isBatch ? scanProposal : formData;

        if (!isNaN(oldSize) && !isNaN(newSize) && oldSize > 0 && newSize > 0 && oldSize !== newSize && (targetState.protein || targetState.calories || targetState.carbs || targetState.fats)) {
            if (isBatch) setBatchOldServingSize(oldSize.toString());
            else setOldServingSize(oldSize.toString());
        }
    };

    const applyProportionalScale = () => {
        const isBatch = macroContext === 'batch';
        const targetState = isBatch ? scanProposal : formData;
        const oldSize = parseFloat(isBatch ? batchOldServingSize : oldServingSize);
        const newSize = parseFloat(targetState.servingSize);
        const ratio = newSize / oldSize;

        const updates = {
            protein: targetState.protein ? (parseFloat(targetState.protein) * ratio).toFixed(1).replace(/\.0$/, '') : '',
            carbs: targetState.carbs ? (parseFloat(targetState.carbs) * ratio).toFixed(1).replace(/\.0$/, '') : '',
            fats: targetState.fats ? (parseFloat(targetState.fats) * ratio).toFixed(1).replace(/\.0$/, '') : '',
            calories: targetState.calories ? Math.round(parseFloat(targetState.calories) * ratio).toString() : ''
        };

        if (isBatch) {
            setScanProposal(prev => ({ ...prev, ...updates }));
            setBatchOldServingSize(newSize.toString());
        } else {
            setFormData(prev => ({ ...prev, ...updates }));
            setOldServingSize(newSize.toString());
        }
    };

    // --- Macro Lookup ---
    const handleAiMacros = async (refinement = '', overrideContext = null) => {
        const activeCtx = overrideContext || macroContext;
        const activeName = activeCtx === 'batch' ? scanProposal?.name : formData.name;
        const activeServing = activeCtx === 'batch' ? scanProposal?.servingSize : formData.servingSize;
        const activeUnit = activeCtx === 'batch' ? scanProposal?.servingUnit : formData.servingUnit;

        if (!activeName || activeName.trim() === '') {
            setConfirmDialog({ isOpen: true, message: "Enter a product name first before searching for macros!", hideCancel: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
            return;
        }

        setAiLoading(true);
        const servingText = activeServing && activeUnit ? `${activeServing}${activeUnit}` : '100g';
        let prompt = `Find 5 to 6 different possible matches for nutrition facts for exactly 1 serving (${servingText}) of "${activeName}". Provide variety in brand, fat percentage, or preparation. 
      Include the 'source' of the data (e.g. USDA, Brand Website). 
      Always provide 'altServings' for standard alternatives (e.g. if standard is 1 scoop (33g), provide 100g as an alt. If standard is 100g, provide 1 cup or 1 scoop as an alt).`;
        if (refinement) prompt += ` Important Refinement/Brand: ${refinement}.`;

        const macroSchema = {
            type: "OBJECT",
            properties: {
                matches: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING" },
                            source: { type: "STRING" },
                            protein: { type: "NUMBER" },
                            carbs: { type: "NUMBER" },
                            fats: { type: "NUMBER" },
                            calories: { type: "NUMBER" },
                            servingSize: { type: "NUMBER" },
                            servingUnit: { type: "STRING" },
                            servingDescription: { type: "STRING" },
                            altServings: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        size: { type: "NUMBER" },
                                        unit: { type: "STRING" },
                                        desc: { type: "STRING" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        const data = await callGemini(prompt, "Nutrition expert.", null, macroSchema);
        setAiLoading(false);
        if (data?.matches && data.matches.length > 0) {
            setMacroOptions(data.matches);
            setShowMacroPicker(true);
        } else {
            setConfirmDialog({ isOpen: true, message: "Failed to find macros. Try a different term.", hideCancel: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
        }
    };

    const applyAltServing = (matchIndex, alt) => {
        setMacroOptions(prev => {
            const next = [...prev];
            const m = next[matchIndex];

            if (!m.base) {
                m.base = { protein: m.protein, carbs: m.carbs, fats: m.fats, calories: m.calories, servingSize: m.servingSize };
            }

            const ratio = alt.size / m.base.servingSize;

            m.protein = Number((m.base.protein * ratio).toFixed(1));
            m.carbs = Number((m.base.carbs * ratio).toFixed(1));
            m.fats = Number((m.base.fats * ratio).toFixed(1));
            m.calories = Math.round(m.base.calories * ratio);
            m.servingSize = alt.size;
            m.servingUnit = alt.unit;
            m.servingDescription = alt.desc;

            return next;
        });
    };

    const selectMacroMatch = (m) => {
        const updates = {
            protein: m.protein?.toString() || '',
            carbs: m.carbs?.toString() || '',
            fats: m.fats?.toString() || '',
            calories: m.calories?.toString() || '',
            servingSize: m.servingSize?.toString(),
            servingUnit: m.servingUnit
        };

        if (macroContext === 'batch') {
            setScanProposal(prev => ({
                ...prev, ...updates,
                servingSize: updates.servingSize || prev.servingSize,
                servingUnit: updates.servingUnit || prev.servingUnit
            }));
            setBatchOldServingSize(updates.servingSize || scanProposal.servingSize);
        } else {
            setFormData(prev => ({
                ...prev, ...updates,
                servingSize: updates.servingSize || prev.servingSize,
                servingUnit: updates.servingUnit || prev.servingUnit
            }));
            setOldServingSize(updates.servingSize || formData.servingSize);
        }

        setShowMacroPicker(false);
        setMacroRefinement('');
    };

    // --- Batch Auto Categorize Feature ---
    const handleAutoCategorizeSelected = async () => {
        const targetItems = entries.filter(e => selectedIds.includes(e.id));
        if (targetItems.length === 0) return;

        setAiLoading(true);
        const prompt = `Categorize the following grocery items into exactly one of these strict categories: ${STANDARD_CATEGORIES.join(', ')}. \n\nItems to categorize: ${JSON.stringify(targetItems.map(e => ({ id: e.id, name: e.name, store: e.store })))}`;

        const schema = {
            type: "OBJECT",
            properties: {
                updates: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            id: { type: "STRING" },
                            category: { type: "STRING" }
                        }
                    }
                }
            }
        };

        const data = await callGemini(prompt, "You are a grocery categorization assistant.", null, schema);
        setAiLoading(false);

        if (data && data.updates && data.updates.length > 0) {
            const proposedUpdates = data.updates.map(update => {
                const originalItem = targetItems.find(item => item.id === update.id);
                return {
                    id: update.id,
                    name: originalItem?.name || 'Unknown',
                    oldCategory: originalItem?.category || 'Other',
                    newCategory: STANDARD_CATEGORIES.includes(update.category) ? update.category : 'Other'
                };
            }).filter(item => item.name !== 'Unknown');

            setCategorizationQueue(proposedUpdates);
            setSelectedIds([]);
        } else {
            setConfirmDialog({ isOpen: true, message: "Failed to categorize items. Try again.", hideCancel: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
        }
    };

    const applyBatchCategorization = async () => {
        if (!user) return;
        setAiLoading(true);
        try {
            const updatePromises = categorizationQueue.map(item =>
                updateDoc(doc(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices', item.id), {
                    category: item.newCategory,
                    updatedAt: serverTimestamp()
                })
            );
            await Promise.all(updatePromises);
            setCategorizationQueue([]);
        } catch (error) {
            console.error("Batch update failed:", error);
            setConfirmDialog({ isOpen: true, message: "Failed to save some categories.", hideCancel: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
        }
        setAiLoading(false);
    };

    const handleDeleteSelected = () => {
        setConfirmDialog({
            isOpen: true,
            message: `Delete ${selectedIds.length} items permanently?`,
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                setAiLoading(true);
                try {
                    const deletePromises = selectedIds.map(id => deleteDoc(doc(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices', id)));
                    await Promise.all(deletePromises);
                    setSelectedIds([]);
                } catch (err) {
                    console.error("Failed to delete items:", err);
                }
                setAiLoading(false);
            },
            onCancel: () => setConfirmDialog({ isOpen: false })
        });
    };

    const triggerDeletion = (id) => {
        setConfirmDialog({
            isOpen: true,
            message: "Delete this entry permanently?",
            onConfirm: async () => {
                await deleteDoc(doc(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices', id));
                setIsDrawerOpen(false);
                setViewingItem(null);
                setConfirmDialog({ isOpen: false });
            },
            onCancel: () => setConfirmDialog({ isOpen: false })
        });
    };

    // --- Clear Database ---
    const handleClearDatabase = () => {
        if (!user) return;
        setConfirmDialog({
            isOpen: true,
            message: "Are you sure you want to delete ALL tracked entries? This cannot be undone.",
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                setShowSettingsMenu(false);
                setAiLoading(true);
                try {
                    const deletePromises = entries.map(entry => deleteDoc(doc(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices', entry.id)));
                    await Promise.all(deletePromises);
                } catch (err) {
                    console.error("Failed to clear database:", err);
                }
                setAiLoading(false);
            },
            onCancel: () => setConfirmDialog({ isOpen: false })
        });
    };

    // --- AI Chat Logic ---
    const callChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        if (!geminiApiKey) {
            setChatMessages([...chatMessages, { role: 'model', text: "Please set your Gemini API key in the settings first." }]);
            setChatInput('');
            return;
        }
        const msgs = [...chatMessages, { role: 'user', text: chatInput }];
        setChatMessages(msgs);
        setChatInput('');
        setAiLoading(true);

        try {
            const dbContext = buildAIContext();
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: msgs.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
                    systemInstruction: { parts: [{ text: `You are NutriPricer Coach. Context: ${userPersona}. User DB Summary: ${dbContext}` }] }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                if (response.status === 400 && errorText.includes("API_KEY_INVALID")) {
                    setChatMessages([...msgs, { role: 'model', text: "Invalid API Key. Please check your key in Settings." }]);
                    setAiLoading(false);
                    return;
                }
                throw new Error("Request failed");
            }
            const result = JSON.parse(await response.text());
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            setChatMessages([...msgs, { role: 'model', text: text || "I encountered an error." }]);
        } catch (err) {
            setChatMessages([...msgs, { role: 'model', text: "Connection error. Please try again." }]);
        }
        setAiLoading(false);
    };

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    // --- Original Code Initialization & Sync ---
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (import.meta.env.VITE_INITIAL_AUTH_TOKEN) {
                    await signInWithCustomToken(auth, import.meta.env.VITE_INITIAL_AUTH_TOKEN);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) { console.error("Auth Error:", err); }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (!u) setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const pricesCol = collection(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices');
        const unsubscribe = onSnapshot(pricesCol, (snapshot) => {
            setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Firestore Error:", err);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const uniqueStores = useMemo(() => {
        const stores = new Set(entries.map(e => {
            let normalizedStore = e.store || 'Market';
            for (const [pattern, storeName] of Object.entries(STORE_ALIASES)) {
                if (new RegExp(`^${pattern}$`, 'i').test(normalizedStore) || new RegExp(`\\b(?:${pattern})\\b`, 'i').test(normalizedStore)) {
                    normalizedStore = storeName;
                    break;
                }
            }
            return normalizedStore;
        }));
        return ['All Stores', ...Array.from(stores).sort()];
    }, [entries]);

    const uniqueCategories = useMemo(() => {
        const cats = new Set(entries.map(e => e.category || 'Other'));
        const allCats = new Set([...STANDARD_CATEGORIES, ...Array.from(cats)]);
        return ['All Categories', ...Array.from(allCats).sort()];
    }, [entries]);

    const handleBackup = () => {
        const dataStr = JSON.stringify(entries, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nutripricer_backup.json`;
        a.click();
        setShowSettingsMenu(false);
    };

    const handleRestore = (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    for (const item of imported) {
                        const docId = item.id || crypto.randomUUID();
                        const { id, ...data } = item;
                        await setDoc(doc(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices', docId), {
                            ...data,
                            updatedAt: serverTimestamp()
                        });
                    }
                    setConfirmDialog({ isOpen: true, message: `Successfully restored ${imported.length} entries.`, hideCancel: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
                }
            } catch (err) {
                setConfirmDialog({ isOpen: true, message: "Failed to parse or restore backup file.", hideCancel: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
        setShowSettingsMenu(false);
    };

    const calculateMetrics = useCallback((item) => {
        const totalWeightBase = (parseFloat(item.weight) || 0) * (UNIT_CONVERSIONS[item.unit] || 1) * (parseFloat(item.quantity) || 1);
        const price = parseFloat(item.price) || 0;
        const servingSizeRaw = parseFloat(item.servingSize) || 100;
        const servingInBaseUnits = servingSizeRaw * (UNIT_CONVERSIONS[item.servingUnit || item.unit] || 1);

        if (totalWeightBase <= 0 || price <= 0) return { normalized: '0.00' };

        const normalized = (price / (totalWeightBase / granularity)).toFixed(2);

        const getYield = (macroKey) => {
            if (item.isNonFood) return null;
            const macroPerServing = parseFloat(item[macroKey]) || 0;
            const totalMacroInPkg = (totalWeightBase / servingInBaseUnits) * macroPerServing;
            return price > 0 ? (totalMacroInPkg / price).toFixed(1) : null;
        };

        const getDensity = (macroKey) => {
            if (item.isNonFood) return null;
            const macroPerServing = parseFloat(item[macroKey]) || 0;
            return ((macroPerServing / servingInBaseUnits) * granularity).toFixed(1);
        }

        const totalCalsInPkg = (totalWeightBase / servingInBaseUnits) * (parseFloat(item.calories) || 0);
        const calYield = price > 0 ? (totalCalsInPkg / price).toFixed(0) : null;

        const pricePerKg = price > 0 && totalWeightBase > 0 ? (price / (totalWeightBase / 1000)).toFixed(2) : null;
        const pricePerLb = price > 0 && totalWeightBase > 0 ? (price / (totalWeightBase / 453.592)).toFixed(2) : null;

        return {
            normalized,
            pricePerKg,
            pricePerLb,
            proteinYield: getYield('protein'),
            carbsYield: getYield('carbs'),
            fatsYield: getYield('fats'),
            caloriesYield: calYield,
            proteinDensity: getDensity('protein'),
            carbsDensity: getDensity('carbs'),
            fatsDensity: getDensity('fats'),
            caloriesDensity: getDensity('calories')
        };
    }, [granularity]);

    const filteredAndSortedEntries = useMemo(() => {
        let result = entries.map(entry => {
            let normalizedStore = entry.store || 'Market';
            for (const [pattern, storeName] of Object.entries(STORE_ALIASES)) {
                if (new RegExp(`^${pattern}$`, 'i').test(normalizedStore) || new RegExp(`\\b(?:${pattern})\\b`, 'i').test(normalizedStore)) {
                    normalizedStore = storeName;
                    break;
                }
            }
            return { ...entry, store: normalizedStore };
        });

        result = result.filter(e => {
            const matchesSearch = e.name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTab = activeTab === 'food' ? !e.isNonFood : e.isNonFood;
            const matchesStore = selectedStore === 'All Stores' || (e.store || 'Market') === selectedStore;
            const matchesCat = selectedCategory === 'All Categories' || (e.category || 'Other') === selectedCategory;
            return matchesSearch && matchesTab && matchesStore && matchesCat;
        });

        result.sort((a, b) => {
            const ma = calculateMetrics(a);
            const mb = calculateMetrics(b);

            // Table Sorting Override
            if (viewMode === 'table') {
                const { key, direction } = tableSort;
                let valA, valB;

                switch (key) {
                    case 'name': valA = a.name; valB = b.name; break;
                    case 'store': valA = a.store || 'Market'; valB = b.store || 'Market'; break;
                    case 'total': valA = parseFloat(a.price); valB = parseFloat(b.price); break;
                    case 'unitPrice': valA = parseFloat(ma.normalized); valB = parseFloat(mb.normalized); break;
                    case 'pro': valA = parseFloat(ma.proteinYield) || 0; valB = parseFloat(mb.proteinYield) || 0; break;
                    case 'date': valA = a.createdAt?.seconds || 0; valB = b.createdAt?.seconds || 0; break;
                    default: valA = 0; valB = 0;
                }

                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            }

            if (sortBy === 'roi') {
                if (displayMetric === 'unit') {
                    return parseFloat(ma.normalized) - parseFloat(mb.normalized);
                } else {
                    const valA = parseFloat(ma[`${displayMetric}Yield`]) || 0;
                    const valB = parseFloat(mb[`${displayMetric}Yield`]) || 0;
                    return valB - valA;
                }
            }

            if (sortBy === 'price') return parseFloat(ma.normalized) - parseFloat(mb.normalized);
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
        return result;
    }, [entries, searchQuery, sortBy, displayMetric, activeTab, selectedStore, selectedCategory, calculateMetrics, viewMode, tableSort]);

    const toggleCompare = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const performParse = (text) => {
        const t = text.toLowerCase();
        let updates = { ...formData, rawText: text };
        let remainingText = text;

        for (const [pattern, storeName] of Object.entries(STORE_ALIASES)) {
            const regex = new RegExp(`\\b(?:${pattern})\\b`, 'i');
            if (regex.test(remainingText)) {
                updates.store = storeName;
                remainingText = remainingText.replace(regex, ' ');
                break;
            }
        }

        const packMatch = remainingText.match(/(\d+)\s*[xX\*]\s*(\d+(?:\.\d+)?)\s*(g|kg|oz|lb|ml|l|ct|count|sheets|napkins|items)?\b/i);
        const weightMatch = remainingText.match(/\b(\d+(?:\.\d+)?)\s*(g|kg|oz|lb|ml|l|ct|count|sheets|napkins|items)\b/i);

        if (packMatch) {
            updates.quantity = packMatch[1];
            updates.weight = packMatch[2];
            const unitLabel = packMatch[3];
            updates.unit = (!unitLabel || ['count', 'sheets', 'napkins', 'items'].includes(unitLabel)) ? 'ct' : unitLabel.toLowerCase();
            remainingText = remainingText.replace(packMatch[0], ' ');
        } else if (weightMatch) {
            updates.weight = weightMatch[1];
            const unitLabel = weightMatch[2];
            updates.unit = (['count', 'sheets', 'napkins', 'items'].includes(unitLabel)) ? 'ct' : unitLabel.toLowerCase();
            remainingText = remainingText.replace(weightMatch[0], ' ');
        }

        const priceMatch = remainingText.match(/\$\s*(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s*\$/i) || remainingText.match(/\b(\d+\.\d{2})\b/);
        if (priceMatch) {
            updates.price = priceMatch[1] || priceMatch[2] || priceMatch[0];
            remainingText = remainingText.replace(priceMatch[0], ' ');
        }

        if (/\b(sale|off|%)\b/i.test(remainingText)) {
            updates.isSale = true;
            remainingText = remainingText.replace(/\b(sale|off|%)\b/ig, ' ');
        }

        let foundMeat = false;
        for (let meat in MEAT_DATABASE) {
            if (t.includes(meat)) {
                const data = MEAT_DATABASE[meat];
                updates.protein = data.protein.toString();
                updates.fats = data.fats.toString();
                updates.carbs = data.carbs.toString();
                updates.calories = data.calories.toString();
                updates.category = data.category || 'Other';
                updates.isNonFood = false;
                updates.servingSize = (data.servingSize || 100).toString();
                updates.servingUnit = data.unit || 'g';
                foundMeat = true;
                break;
            }
        }

        const nonFoodKeywords = ['napkin', 'towel', 'detergent', 'soap', 'shampoo', 'cleaner', 'tide', 'clorox', 'paper', 'tissue', 'bag', 'batteries', 'razor', 'paste', 'trash', 'foil'];
        if (!foundMeat && nonFoodKeywords.some(k => t.includes(k))) {
            updates.isNonFood = true;
            updates.category = 'Household';
        }

        const nameCleaned = remainingText.replace(/\b(at|for|on|from|in)\b/ig, '').replace(/[^\w\s-]/g, '').trim().replace(/\s{2,}/g, ' ');
        if (nameCleaned.length > 2) {
            updates.name = nameCleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        setFormData(updates);
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!user || !formData.name || !formData.price) return;
        try {
            if (viewingItem?.id) {
                await updateDoc(doc(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices', viewingItem.id), { ...formData, updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, 'artifacts', PERSISTENT_APP_ID, 'users', user.uid, 'prices'), { ...formData, createdAt: serverTimestamp() });
            }
            setFormData(defaultForm);
            setIsDrawerOpen(false);
            setViewingItem(null);
        } catch (err) { console.error("Save Error:", err); }
    };

    return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans pb-12 transition-colors duration-300`}>
            {/* Universal Sandbox-Safe Modal Component */}
            {confirmDialog.isOpen && (
                <div className="fixed inset-0 z-[400] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className={`${theme.surface} rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border ${theme.border}`}>
                        <h3 className={`text-lg font-black ${theme.text} mb-6 text-center leading-tight`}>{confirmDialog.message}</h3>
                        <div className="flex gap-4">
                            {!confirmDialog.hideCancel && (
                                <button onClick={confirmDialog.onCancel} className={`flex-1 py-4 ${theme.btnMuted} rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all`}>Cancel</button>
                            )}
                            <button onClick={confirmDialog.onConfirm} className="flex-1 py-4 bg-blue-600 rounded-2xl font-black text-white uppercase tracking-widest text-[11px] hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Categories Modal */}
            {categorizationQueue.length > 0 && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in fade-in">
                    <div className={`${theme.surface} border ${theme.border} w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[90vh]`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-lg font-black uppercase tracking-tighter flex items-center gap-2 ${theme.text}`}><Sparkles size={18} className="text-blue-500" /> Review Categories</h3>
                            <button onClick={() => setCategorizationQueue([])} className={`${theme.btnMuted} border p-2 rounded-full transition-colors`}><X size={16} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar mb-4">
                            {categorizationQueue.map((item, index) => (
                                <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${theme.border} ${theme.inputBg}`}>
                                    <span className={`text-sm font-bold truncate pr-4 ${theme.text} flex-1`}>{item.name}</span>
                                    <select
                                        value={item.newCategory}
                                        onChange={(e) => {
                                            const newQueue = [...categorizationQueue];
                                            newQueue[index].newCategory = e.target.value;
                                            setCategorizationQueue(newQueue);
                                        }}
                                        className={`w-36 appearance-none ${theme.blueAccentBg} ${theme.blueAccentText} border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer transition-all shrink-0`}
                                    >
                                        {STANDARD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className={`flex gap-3 pt-2 border-t ${theme.border}`}>
                            <button onClick={() => setCategorizationQueue([])} className={`flex-1 py-3 ${theme.btnMuted} rounded-xl font-black uppercase tracking-widest text-[11px] transition-all`}>Discard</button>
                            <button onClick={applyBatchCategorization} className="flex-1 py-3 bg-blue-600 rounded-xl font-black text-white uppercase tracking-widest text-[11px] hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Bar for Selection Mode */}

            {/* Fullscreen Image Viewer */}
            {fullscreenImage && (
                <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in" onClick={() => setFullscreenImage(null)}>
                    <button className="absolute top-6 right-6 text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
                    <img src={fullscreenImage} alt="Expanded view" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}

            {/* Hidden Batch Inputs */}
            <input type="file" accept="image/*" capture="environment" multiple ref={cameraInputRef} onChange={handleBatchSelection} className="hidden" />
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleRestore} className="hidden" />
            <input type="file" accept="image/*" multiple ref={galleryInputRef} onChange={handleBatchSelection} className="hidden" />

            {/* Consolidated Header */}
            <header className={`sticky top-0 z-50 ${theme.surface} border-b ${theme.border} backdrop-blur-md bg-opacity-95`}>
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="flex flex-col truncate">
                            <h1 className={`text-lg md:text-xl font-black tracking-tighter text-blue-600 flex items-center gap-1 uppercase truncate`}>
                                <Activity size={18} />
                                <span className="truncate">NUTRIPRICR</span>
                            </h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                                <span className={`text-[8px] font-black uppercase ${theme.textMuted} tracking-widest truncate`}>{user ? 'Live' : 'Offline'}</span>
                            </div>
                        </div>

                        <nav className={`flex items-center gap-0.5 ml-2 md:ml-4 py-1 px-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-xl shrink-0`}>
                            <button
                                onClick={() => { setActiveTab('food'); setDisplayMetric('unit'); }}
                                className={`px-2 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'food' ? `${isDarkMode ? 'bg-slate-700' : 'bg-white'} text-blue-600 shadow-sm` : theme.textMuted}`}
                            >
                                <span className="md:hidden">Food</span>
                                <span className="hidden md:inline">Nutrition</span>
                            </button>
                            <button
                                onClick={() => { setActiveTab('non-food'); setDisplayMetric('unit'); }}
                                className={`px-2 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'non-food' ? `${isDarkMode ? 'bg-slate-700' : 'bg-white'} text-blue-600 shadow-sm` : theme.textMuted}`}
                            >
                                <span className="md:hidden">Home</span>
                                <span className="hidden md:inline">Household</span>
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setIsSearchVisible(!isSearchVisible)} className={`p-2.5 rounded-full border ${theme.border} ${isSearchVisible ? 'bg-blue-600 text-white border-blue-600' : theme.surface + ' ' + theme.textMuted} transition-all`}>
                            <Search size={18} />
                        </button>
                        <button onClick={() => setIsFilterVisible(!isFilterVisible)} className={`p-2.5 rounded-full border ${theme.border} ${isFilterVisible ? 'bg-blue-600 text-white border-blue-600' : theme.surface + ' ' + theme.textMuted} transition-all`}>
                            <Filter size={18} />
                        </button>
                        <div className={`p-1 rounded-full border ${theme.border} ${theme.surface} flex items-center`}>
                            <button
                                onClick={() => {
                                    const sequence = [1, 10, 100, 1000];
                                    const next = sequence[(sequence.indexOf(granularity) + 1) % sequence.length];
                                    setGranularity(next);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase bg-blue-600/10 text-blue-600"
                            >
                                {granularity === 1000 ? '1kg' : `${granularity}g`}
                                <RefreshCw size={12} />
                            </button>
                        </div>
                        <div className={`h-8 w-px ${theme.border} mx-1 hidden md:block`} />
                        <button onClick={() => setIsChatOpen(true)} className={`p-2.5 rounded-xl border ${theme.border} ${theme.surface} ${theme.textMuted} hidden md:block transition-all ${isDarkMode ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50'}`}>
                            <MessageSquare size={18} />
                        </button>
                        <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className={`p-2.5 rounded-xl border ${theme.border} ${theme.surface} ${theme.textMuted} transition-all`}>
                            <Settings size={18} />
                        </button>
                        <button onClick={() => {
                            setFormData(defaultForm);
                            setOldServingSize('100');
                            setViewingItem(null);
                            setIsDrawerOpen(true);
                        }} className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 font-bold text-xs ml-1">
                            <Plus size={18} /> <span className="hidden sm:inline">Add</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Settings Menu Modal */}
            {showSettingsMenu && (
                <div className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className={`${theme.surface} border ${theme.border} w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-xl font-black uppercase tracking-tighter flex items-center gap-2 ${theme.text}`}><Settings size={20} className="text-blue-600" /> Settings</h3>
                            <button onClick={() => setShowSettingsMenu(false)} className={`${theme.btnMuted} border p-2 rounded-full transition-colors`}><X size={16} /></button>
                        </div>
                        <div className="space-y-3">
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-full ${theme.btnMuted} border p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all`}>
                                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                                {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            </button>
                            <button onClick={handleBackup} className={`w-full ${theme.btnMuted} border p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all`}><Download size={16} /> Backup Database</button>
                            <button onClick={() => fileInputRef.current?.click()} className={`w-full ${theme.btnMuted} border p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all`}><Upload size={16} /> Restore Database</button>
                            <button onClick={() => { setTempPersona(userPersona); setShowPersonaSettings(true); setShowSettingsMenu(false); }} className={`w-full ${theme.btnMuted} border p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all`}><UserCog size={16} /> Edit AI Persona</button>
                            <button onClick={() => { setTempApiKey(geminiApiKey); testApiKey(geminiApiKey); setShowApiSettings(true); setShowSettingsMenu(false); }} className={`w-full ${theme.btnMuted} border p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all`}><Zap size={16} /> Configure API Key</button>
                            <button onClick={() => { setShowChangelog(true); setShowSettingsMenu(false); }} className={`w-full ${theme.btnMuted} border p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all`}><Layers size={16} /> Version History</button>

                            <div className={`pt-4 border-t ${theme.border} mt-4`}>
                                <button onClick={handleClearDatabase} className={`w-full ${isDarkMode ? 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40' : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'} p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all`}><Trash2 size={16} /> Clear All Entries</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Comparison Fullscreen View */}
            {showCompareView && selectedIds.length > 0 && (
                <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[12px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                            <ArrowLeftRight size={18} /> Comparison Matrix ({selectedIds.length})
                        </span>
                        <button onClick={() => setShowCompareView(false)} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-x-auto no-scrollbar pb-10">
                        <div className={`flex gap-6 divide-x divide-white/10 min-w-max h-full`}>
                            {selectedIds.map(id => {
                                const item = entries.find(e => e.id === id);
                                if (!item) return null;
                                const m = calculateMetrics(item);
                                const displayGranularity = granularity === 1000 ? 1 : granularity;
                                const unitLabel = item.unit === 'ct' ? 'ct' : (granularity === 1000 ? (item.unit === 'ml' || item.unit === 'l' ? 'L' : 'kg') : (item.unit === 'ml' || item.unit === 'l' ? 'ml' : 'g'));

                                return (
                                    <div key={id} className="w-80 px-6 overflow-y-auto no-scrollbar">
                                        <div className="aspect-square w-full rounded-2xl bg-white/5 border border-white/10 mb-6 overflow-hidden flex items-center justify-center">
                                            {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={48} className="text-white/20" />}
                                        </div>
                                        <div className="h-16 flex flex-col justify-center mb-2">
                                            <div className={`text-[15px] font-black uppercase text-white leading-tight line-clamp-2`}>{item.name}</div>
                                        </div>
                                        <div className="text-[10px] font-bold text-emerald-400 mb-4 flex items-center gap-1 uppercase tracking-widest"><ShoppingCart size={12} /> {item.store || 'Market'}</div>
                                        <div className="text-3xl font-black text-white leading-tight mb-8">${m.normalized} <span className="text-[12px] font-bold text-blue-500 uppercase">/{displayGranularity}{unitLabel}</span></div>
                                        {!item.isNonFood && (
                                            <div className="space-y-4 border-t border-white/5 pt-6">
                                                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-500 font-bold uppercase text-[10px]">Protein</span>
                                                        <span className="text-[12px] text-blue-400 font-black">{m.proteinDensity}g/{displayGranularity}{unitLabel}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] text-slate-500 uppercase font-black">Yield</span>
                                                        <span className="font-bold text-[14px] text-white">{m.proteinYield || '--'}g/$1</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-500 font-bold uppercase text-[10px]">Carbs</span>
                                                        <span className="text-[12px] text-blue-400 font-black">{m.carbsDensity}g/{displayGranularity}{unitLabel}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] text-slate-500 uppercase font-black">Yield</span>
                                                        <span className="font-bold text-[14px] text-white">{m.carbsYield || '--'}g/$1</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-500 font-bold uppercase text-[10px]">Fats</span>
                                                        <span className="text-[12px] text-blue-400 font-black">{m.fatsDensity}g/{displayGranularity}{unitLabel}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] text-slate-500 uppercase font-black">Yield</span>
                                                        <span className="font-bold text-[14px] text-white">{m.fatsYield || '--'}g/$1</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-500 font-bold uppercase text-[10px]">Calories</span>
                                                        <span className="text-[12px] text-blue-400 font-black">{m.caloriesDensity}/{displayGranularity}{unitLabel}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] text-slate-500 uppercase font-black">Yield</span>
                                                        <span className="font-bold text-[14px] text-orange-400">{m.caloriesYield || '--'}Cal/$1</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            {showDetailView && selectedDetailItem && (
                <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowDetailView(false)}>
                    <div className={`relative ${theme.surface} w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-400 border ${theme.border}`} onClick={e => e.stopPropagation()}>
                        <div className="absolute top-6 right-6 z-10">
                            <button onClick={() => setShowDetailView(false)} className={`${theme.btnMuted} border p-3 rounded-full transition-all hover:rotate-90`}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto no-scrollbar">
                            <div className={`w-full md:w-1/2 aspect-square ${isDarkMode ? 'bg-slate-800 border-slate-800' : 'bg-slate-100 border-slate-200'} flex items-center justify-center border-b md:border-b-0 md:border-r`}>
                                {selectedDetailItem.image ? (
                                    <img src={selectedDetailItem.image} className="w-full h-full object-cover" />
                                ) : (
                                    <Package size={64} className={isDarkMode ? 'text-slate-700' : 'text-slate-300'} />
                                )}
                            </div>

                            <div className="p-8 flex-1 flex flex-col">
                                <div className="mb-6">
                                    <div className={`text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2`}>{selectedDetailItem.store || 'Market'} • {selectedDetailItem.category}</div>
                                    <h2 className={`text-2xl font-black uppercase tracking-tighter leading-tight ${theme.text}`}>{selectedDetailItem.name}</h2>
                                </div>

                                <div className="flex items-baseline gap-2 mb-8">
                                    <span className={`text-4xl font-black ${theme.text}`}>${parseFloat(selectedDetailItem.price).toFixed(2)}</span>
                                    {selectedDetailItem.weight && (
                                        <span className={`text-sm font-bold ${theme.textMuted}`}>/ {selectedDetailItem.weight}{selectedDetailItem.unit}</span>
                                    )}
                                </div>

                                {!selectedDetailItem.isNonFood && (
                                    <div className="space-y-4 mb-10">
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: 'Protein', value: selectedDetailItem.protein, color: 'text-blue-500' },
                                                { label: 'Carbs', value: selectedDetailItem.carbs, color: 'text-emerald-500' },
                                                { label: 'Fats', value: selectedDetailItem.fats, color: 'text-orange-500' },
                                                { label: 'Calories', value: selectedDetailItem.calories, color: 'text-purple-500' }
                                            ].map(macro => (
                                                <div key={macro.label} className={`${theme.inputBg} p-4 rounded-2xl border ${theme.border}`}>
                                                    <div className={`text-[9px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>{macro.label}</div>
                                                    <div className={`text-lg font-black ${macro.color}`}>{macro.value || '--'}{macro.label === 'Calories' ? '' : 'g'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto flex gap-3">
                                    <button
                                        onClick={() => {
                                            setViewingItem(selectedDetailItem);
                                            setFormData(selectedDetailItem);
                                            setOldServingSize(selectedDetailItem.servingSize || '100');
                                            setMacroContext('editor');
                                            setIsDrawerOpen(true);
                                            setShowDetailView(false);
                                        }}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[12px] py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Wand2 size={16} /> Edit Entry
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expandable Search & Filter Bar */}
            <div className={`sticky top-16 z-40 ${theme.bg} bg-opacity-95 backdrop-blur-md overflow-hidden transition-all duration-300 ${isSearchVisible || isFilterVisible ? 'max-h-64 border-b ' + theme.border : 'max-h-0'}`}>
                <div className="max-w-6xl mx-auto p-4 space-y-4">
                    {isSearchVisible && (
                        <div className="relative">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={18} />
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${activeTab === 'food' ? 'protein, dairy...' : 'cleaning, paper...'}`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-11 pr-4 py-4 ${theme.surface} border ${theme.border} rounded-2xl outline-none text-sm font-medium transition-all ${theme.text}`}
                            />
                        </div>
                    )}
                    {isFilterVisible && (
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar items-center">
                            <div className="relative flex-shrink-0">
                                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={`appearance-none ${theme.blueAccentBg} ${theme.blueAccentText} border pl-9 pr-8 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer max-w-[140px] truncate`}>
                                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={14} />
                            </div>
                            <div className="relative flex-shrink-0">
                                <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className={`appearance-none ${theme.blueAccentBg} ${theme.blueAccentText} border pl-9 pr-8 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer`}>
                                    {uniqueStores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={14} />
                            </div>
                            <div className="relative flex-shrink-0">
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`appearance-none ${theme.blueAccentBg} ${theme.blueAccentText} border pl-9 pr-8 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer`}>
                                    <option value="date">Newest</option>
                                    <option value="roi">Best ROI</option>
                                    <option value="price">Lowest $</option>
                                </select>
                                <List className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={14} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={`sticky top-[calc(4rem+1px)] z-30 ${theme.bg} bg-opacity-90 backdrop-blur-md py-3 border-b ${theme.border}`}>
                <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto no-scrollbar">
                    {(activeTab === 'non-food' ? [
                        { id: 'unit', label: 'Unit', icon: <Scale size={12} /> },
                        { id: 'kg', label: 'Per kg', icon: <Scale size={12} /> },
                        { id: 'lb', label: 'Per lb', icon: <Scale size={12} /> }
                    ] : [
                        { id: 'unit', label: 'Unit', icon: <Scale size={12} /> },
                        { id: 'kg', label: 'Per kg', icon: <Scale size={12} /> },
                        { id: 'lb', label: 'Per lb', icon: <Scale size={12} /> },
                        { id: 'protein', label: 'Pro', icon: <Zap size={12} /> },
                        { id: 'fats', label: 'Fat', icon: <Droplets size={12} /> },
                        { id: 'carbs', label: 'Carb', icon: <PieChart size={12} /> },
                        { id: 'calories', label: 'Cal', icon: <Flame size={12} /> },
                    ]).map(btn => (
                        <button key={btn.id} onClick={() => setDisplayMetric(btn.id)} className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all flex-shrink-0 border ${displayMetric === btn.id ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : `${theme.surface} ${theme.textMuted} ${theme.border}`}`}>
                            {btn.icon} {btn.label}
                        </button>
                    ))}
                    <div className="flex-1" />
                    <button
                        onClick={() => {
                            const modes = ['grid', 'list', 'table'];
                            const next = modes[(modes.indexOf(viewMode) + 1) % modes.length];
                            setViewMode(next);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-black uppercase border shadow-sm transition-all ${theme.surface} ${theme.textMuted} ${theme.border} active:scale-95 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-blue-50'}`}
                    >
                        {viewMode === 'grid' && <LayoutGrid size={14} />}
                        {viewMode === 'list' && <List size={14} />}
                        {viewMode === 'table' && <TableProperties size={14} />}
                        <span className="min-w-[40px]">{viewMode}</span>
                    </button>
                </div>
            </div>

            <main className={`max-w-6xl mx-auto px-4 gap-4 mt-4 ${viewMode === 'list' ? 'flex flex-col' : (viewMode === 'table' ? `flex flex-col ${theme.surface} rounded-3xl border ${theme.border} overflow-hidden` : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}`}>
                {loading ? <div className={`col-span-full text-center py-20 ${theme.textMuted} font-bold uppercase text-[10px] tracking-widest animate-pulse`}>Scanning Cloud...</div> :
                    (viewMode === 'table' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className={`border-b ${theme.border} ${theme.surface} text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>
                                        <th className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setTableSort(prev => ({ key: 'name', direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                                            <div className="flex items-center gap-1">
                                                Item {tableSort.key === 'name' && (tableSort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                            </div>
                                        </th>
                                        {visibleColumns.includes('store') && (
                                            <th className="px-4 py-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setTableSort(prev => ({ key: 'store', direction: prev.key === 'store' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                                                <div className="flex items-center gap-1">
                                                    Store {tableSort.key === 'store' && (tableSort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.includes('total') && (
                                            <th className="px-4 py-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setTableSort(prev => ({ key: 'total', direction: prev.key === 'total' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                                                <div className="flex items-center gap-1">
                                                    Total {tableSort.key === 'total' && (tableSort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.includes('unitPrice') && (
                                            <th className="px-4 py-4 cursor-pointer hover:text-blue-600 transition-colors text-blue-600" onClick={() => setTableSort(prev => ({ key: 'unitPrice', direction: prev.key === 'unitPrice' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                                                <div className="flex items-center gap-1">
                                                    Unit $ {tableSort.key === 'unitPrice' && (tableSort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        {activeTab !== 'non-food' && visibleColumns.includes('pro') && (
                                            <th className="px-4 py-4 cursor-pointer hover:text-blue-600 transition-colors text-orange-500 font-black" onClick={() => setTableSort(prev => ({ key: 'pro', direction: prev.key === 'pro' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                                                <div className="flex items-center gap-1">
                                                    Pro {tableSort.key === 'pro' && (tableSort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        <th className="px-4 py-4 text-right pr-6">
                                            <div className="flex items-center justify-end gap-2 text-slate-400">
                                                <span>Action</span>
                                                <div className="relative group">
                                                    <button className={`p-1 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-md transition-all opacity-40 hover:opacity-100`}>
                                                        <Settings2 size={14} />
                                                    </button>
                                                    <div className={`absolute top-full right-0 mt-2 w-48 ${theme.surface} border ${theme.border} rounded-xl shadow-2xl p-3 z-20 hidden group-hover:block transition-all`}>
                                                        <div className={`text-[9px] font-black uppercase tracking-widest ${theme.textMuted} mb-2 px-1 text-left`}>Visible Columns</div>
                                                        {['store', 'total', 'unitPrice', 'pro'].map(col => (
                                                            <label key={col} className={`flex items-center gap-3 px-2 py-1.5 hover:${theme.inputBg} rounded-lg cursor-pointer transition-colors w-full`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={visibleColumns.includes(col)}
                                                                    onChange={() => setVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                                                                    className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500"
                                                                />
                                                                <span className={`text-[10px] font-bold uppercase ${theme.text} capitalize`}>{col === 'unitPrice' ? 'Unit Price' : col}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedEntries.map(entry => {
                                        const m = calculateMetrics(entry);
                                        const displayGranularity = granularity === 1000 ? 1 : granularity;
                                        const unitLabel = entry.unit === 'ct' ? 'ct' : (granularity === 1000 ? (entry.unit === 'ml' || entry.unit === 'l' ? 'L' : 'kg') : (entry.unit === 'ml' || entry.unit === 'l' ? 'ml' : 'g'));
                                        const isSelected = selectedIds.includes(entry.id);
                                        const isComparing = selectedIds.includes(entry.id);                            return (
                                    <tr key={entry.id} className={`border-b ${theme.border} ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} transition-colors group cursor-pointer`} onClick={() => {
                                        setSelectedDetailItem(entry);
                                        setShowDetailView(true);
                                    }}>
                                                <td className="px-6 py-4 font-bold flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} shrink-0 overflow-hidden flex items-center justify-center`}>
                                                        {entry.image ? <img src={entry.image} className="w-full h-full object-cover" /> : <Package size={14} className={theme.textMuted} />}
                                                    </div>
                                                    <span className="truncate max-w-[120px] md:max-w-[200px]">{entry.name}</span>
                                                </td>
                                                {visibleColumns.includes('store') && <td className="px-4 py-4 text-[10px] font-black uppercase opacity-60 truncate max-w-[80px]">{entry.store || 'Market'}</td>}
                                                {visibleColumns.includes('total') && <td className="px-4 py-4 font-black">${parseFloat(entry.price).toFixed(2)}</td>}
                                                {visibleColumns.includes('unitPrice') && (
                                                    <td className="px-4 py-4 md:whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-lg font-black text-[11px] ${displayMetric === 'unit' ? 'bg-blue-600/10 text-blue-600' : 'bg-orange-500/10 text-orange-500'}`}>
                                                            {(() => {
                                                                if (!entry.isNonFood && displayMetric !== 'unit' && displayMetric !== 'kg' && displayMetric !== 'lb') {
                                                                    if (displayMetric === 'calories') return `${m[`${displayMetric}Yield`] || '--'} CAL/$1`;
                                                                    return `${m[`${displayMetric}Yield`] || '--'}g ${displayMetric.substring(0, 3).toUpperCase()}/$1`;
                                                                } else if (displayMetric === 'kg') return `$${m.pricePerKg || '--'}/kg`;
                                                                else if (displayMetric === 'lb') return `$${m.pricePerLb || '--'}/lb`;
                                                                return `$${m.normalized}/${displayGranularity}${unitLabel}`;
                                                            })()}
                                                        </span>
                                                    </td>
                                                )}
                                                {activeTab !== 'non-food' && visibleColumns.includes('pro') && (
                                                    <td className="px-4 py-4 text-[11px] font-bold text-orange-500">
                                                        {m.proteinYield || '--'}g/$1
                                                    </td>
                                                )}
                                                <td className="px-4 py-4 text-right pr-6">
                                                    <button onClick={(e) => { e.stopPropagation(); toggleCompare(entry.id); }} className={`p-2 rounded-lg transition-colors ${isComparing ? 'bg-blue-600 text-white' : `${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} text-slate-400`}`}>
                                                        <ArrowLeftRight size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        filteredAndSortedEntries.map(entry => {
                            const m = calculateMetrics(entry);
                            const isComparing = selectedIds.includes(entry.id);
                            const isSelected = selectedIds.includes(entry.id);
                            const displayGranularity = granularity === 1000 ? 1 : granularity;
                            const unitLabel = entry.unit === 'ct' ? 'ct' : (granularity === 1000 ? (entry.unit === 'ml' || entry.unit === 'l' ? 'L' : 'kg') : (entry.unit === 'ml' || entry.unit === 'l' ? 'ml' : 'g'));

                            let badgeText = `$${m.normalized}/${displayGranularity}${unitLabel}`;

                            if (!entry.isNonFood && displayMetric !== 'unit' && displayMetric !== 'kg' && displayMetric !== 'lb') {
                                if (displayMetric === 'calories') {
                                    badgeText = `${m[`${displayMetric}Yield`] || 'N/A'} CAL / $1`;
                                } else {
                                    badgeText = `${m[`${displayMetric}Yield`] || 'N/A'}g ${displayMetric.substring(0, 3).toUpperCase()} / $1`;
                                }
                            } else if (displayMetric === 'kg') {
                                badgeText = m.pricePerKg ? `$${m.pricePerKg} / kg` : 'N/A';
                            } else if (displayMetric === 'lb') {
                                badgeText = m.pricePerLb ? `$${m.pricePerLb} / lb` : 'N/A';
                            }

                            return (
                                <div key={entry.id} className={`group ${theme.surface} p-4 rounded-[1.8rem] border transition-all relative flex gap-4 items-center ${isComparing || isSelected ? 'border-blue-500 ring-4 ring-blue-500/20' : `${theme.border} shadow-sm ${theme.cardHover} active:scale-[0.98] cursor-pointer`}`}>
                                    {/* Image Section */}
                                    <div className="relative shrink-0">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCompare(entry.id);
                                            }}
                                            className={`${showImages ? 'w-24 h-24' : 'w-10 h-10'} rounded-2xl flex items-center justify-center transition-all overflow-hidden ${isComparing || isSelected ? 'bg-blue-600 text-white' : `${theme.inputBg} ${theme.textMuted} border ${theme.border} ${isDarkMode ? 'hover:bg-slate-700 hover:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-500'}`}`}
                                        >
                                            {showImages ? (
                                                entry.image ? <img src={entry.image} className="w-full h-full object-cover" /> : (entry.isNonFood ? <Hash size={32} /> : (Object.keys(MEAT_DATABASE).some(k => entry.name.toLowerCase().includes(k)) ? <Beef size={32} /> : <Package size={32} />))
                                            ) : (
                                                <ArrowLeftRight size={16} />
                                            )}
                                        </div>
                                        {showImages && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleCompare(entry.id); }}
                                                className={`absolute -bottom-2 -right-2 p-2 rounded-full shadow-lg border-2 z-10 transition-all ${isComparing ? `bg-blue-600 text-white ${isDarkMode ? 'border-slate-900' : 'border-white'}` : `${isDarkMode ? 'bg-slate-800 border-slate-900' : 'bg-white border-white'} text-blue-600 hover:scale-110`}`}
                                            >
                                                <ArrowLeftRight size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex-1 min-w-0" onClick={() => {
                                        setSelectedDetailItem(entry);
                                        setShowDetailView(true);
                                    }}>
                                        <h3 className={`text-[13px] font-black uppercase leading-tight ${theme.text} mb-1 line-clamp-2 break-words`}>
                                            {entry.name}
                                        </h3>
                                        <div className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-tight flex items-center gap-1 overflow-hidden`}>
                                            <span className="truncate min-w-0">{entry.store || 'Market'}</span>
                                            <span className="opacity-50 shrink-0">•</span>
                                            <span className="shrink-0 whitespace-nowrap">{entry.weight}{entry.unit}</span>
                                        </div>

                                        <div className="flex justify-between items-end mt-3 gap-2">
                                            <div className="flex flex-col shrink-0">
                                                <span className={`text-[18px] font-black ${theme.text}`}>${parseFloat(entry.price).toFixed(2)}</span>
                                                {entry.isSale && entry.originalPrice && parseFloat(entry.originalPrice) > parseFloat(entry.price) && (
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[10px] font-bold ${theme.textMuted} line-through`}>${parseFloat(entry.originalPrice).toFixed(2)}</span>
                                                        <span className="text-[9px] font-black text-red-500">-{Math.round(((parseFloat(entry.originalPrice) - parseFloat(entry.price)) / parseFloat(entry.originalPrice)) * 100)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`shrink-0 px-3 py-2 rounded-2xl text-[11px] font-black shadow-md whitespace-nowrap ${entry.isSale ? 'bg-red-500 text-white' : (displayMetric === 'unit' ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white')}`}>
                                                {(() => {
                                                    if (!entry.isNonFood && displayMetric !== 'unit' && displayMetric !== 'kg' && displayMetric !== 'lb') {
                                                        if (displayMetric === 'calories') return `${m[`${displayMetric}Yield`] || 'N/A'} CAL/$1`;
                                                        return `${m[`${displayMetric}Yield`] || 'N/A'}g ${displayMetric.substring(0, 3).toUpperCase()}/$1`;
                                                    } else if (displayMetric === 'kg') return `$${m.pricePerKg || 'N/A'}/kg`;
                                                    else if (displayMetric === 'lb') return `$${m.pricePerLb || 'N/A'}/lb`;
                                                    return `$${m.normalized}/${displayGranularity}${unitLabel}`;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ))}
                {!loading && filteredAndSortedEntries.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-3">
                        <div className={`w-16 h-16 ${theme.inputBg} rounded-full flex items-center justify-center mx-auto ${theme.textMuted}`}>
                            <Search size={32} />
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>No matching entries</p>
                    </div>
                )}

                {/* Unified Floating Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-md animate-in slide-in-from-bottom duration-500">
                        <div className="bg-slate-900/90 backdrop-blur-2xl ring-1 ring-white/20 rounded-3xl p-3 shadow-2xl flex items-center justify-between text-white">
                            <div className="flex items-center gap-3 pl-3">
                                <div className="bg-blue-600 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center">
                                    {selectedIds.length}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Selected</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowCompareView(true)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    <ArrowLeftRight size={14} /> Compare
                                </button>
                                
                                <div className="relative">
                                    <button
                                        onClick={() => setShowBulkActionMenu(!showBulkActionMenu)}
                                        className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-2xl transition-all"
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {showBulkActionMenu && (
                                        <div className="absolute bottom-full right-0 mb-4 w-48 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <button
                                                onClick={() => { setShowBulkActionMenu(false); handleAutoCategorizeSelected(); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-slate-300 hover:bg-white/5 transition-colors border-b border-white/5"
                                            >
                                                <Sparkles size={14} className="text-purple-400" /> Auto-Categorize
                                            </button>
                                            <button
                                                onClick={() => { setShowBulkActionMenu(false); handleDeleteSelected(); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 size={14} /> Delete Selected
                                            </button>
                                            <button
                                                onClick={() => { setSelectedIds([]); setShowBulkActionMenu(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-slate-500 hover:bg-white/5 transition-colors border-t border-white/5"
                                            >
                                                <X size={14} /> Clear Selection
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Editor Drawer */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 flex flex-col md:flex-row justify-end bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />
                    <div className={`relative ${theme.surface} rounded-t-[3.5rem] md:rounded-t-none md:rounded-l-[3.5rem] p-8 md:p-10 w-full max-h-[96vh] md:max-h-screen md:w-[500px] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-400 border-l ${theme.border}`}>
                        <div className={`w-16 h-1.5 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-full mx-auto mb-8 md:hidden`} />

                        <div className="flex justify-between items-center mb-8">
                            <h2 className={`text-2xl font-black uppercase tracking-tighter ${theme.text}`}>{viewingItem ? 'Edit Entry' : 'New Entry'}</h2>
                            <div className="flex items-center gap-2">
                                {viewingItem && (
                                    <button type="button" onClick={() => triggerDeletion(viewingItem.id)} className={`p-3 rounded-2xl border transition-colors ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40' : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'}`}>
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button type="button" onClick={() => setIsDrawerOpen(false)} className={`p-3 rounded-2xl border transition-colors ${theme.btnMuted}`}><X size={20} /></button>
                            </div>
                        </div>

                        <form onSubmit={handleAddEntry} className="space-y-8 pb-12">
                            <div className="flex gap-3 mb-2">
                                <button type="button" onClick={() => cameraInputRef.current?.click()} className={`flex-1 ${theme.btnMuted} border p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all`}>
                                    <Camera size={20} className="text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Take Photos</span>
                                </button>
                                <button type="button" onClick={() => galleryInputRef.current?.click()} className={`flex-1 ${theme.btnMuted} border p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all`}>
                                    <ImageIcon size={20} className="text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Batch Import</span>
                                </button>
                            </div>

                            {formData.image && (
                                <div className={`w-full h-32 ${theme.inputBg} rounded-2xl overflow-hidden relative border ${theme.border} group`}>
                                    <img src={formData.image} className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform" onClick={() => setFullscreenImage(formData.image)} />
                                    <button type="button" onClick={() => setFormData({ ...formData, image: null })} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors"><X size={14} /></button>
                                </div>
                            )}

                            <div className={`${theme.blueAccentBg} p-5 rounded-[2.5rem] border`}>
                                <div className={`flex items-center gap-2 mb-3 ${theme.blueAccentText}`}>
                                    <Wand2 size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Smart Scan Text</span>
                                </div>
                                <textarea
                                    value={formData.rawText}
                                    onChange={(e) => performParse(e.target.value)}
                                    placeholder="E.g. Chicken breast 1.5kg $18.99 at NoFrills"
                                    className={`w-full ${theme.surface} ${theme.text} border-0 rounded-2xl p-4 text-sm font-medium outline-none h-24 shadow-inner resize-none focus:ring-2 focus:ring-blue-500/50 ${isDarkMode ? 'placeholder-slate-500' : 'placeholder-slate-400'}`}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between ml-4">
                                    <label className={`text-[10px] font-black uppercase ${theme.textMuted} block`}>Product Title</label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <span className={`text-[9px] font-black uppercase ${theme.textMuted}`}>Non-Food</span>
                                        <input type="checkbox" checked={formData.isNonFood} onChange={e => setFormData({ ...formData, isNonFood: e.target.checked })} className={`w-3.5 h-3.5 rounded text-blue-600 ${theme.border} ${theme.inputBg}`} />
                                    </label>
                                </div>
                                <div className="group">
                                    <input required placeholder="E.g. Ground Beef" className={`w-full ${theme.inputBg} border-0 rounded-3xl p-5 text-[15px] font-bold outline-none ${theme.inputFocus} transition-all ${theme.text} ${isDarkMode ? 'placeholder-slate-500' : 'placeholder-slate-400'}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <label className={`text-[10px] font-black uppercase ${theme.textMuted} ml-4 mb-1 block`}>Category</label>
                                        <select className={`w-full ${theme.inputBg} border-0 rounded-3xl p-5 text-[14px] font-bold outline-none ${theme.inputFocus} transition-all ${theme.text} appearance-none`} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            {STANDARD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className={`text-[10px] font-black uppercase ${theme.textMuted} ml-4 mb-1 block`}>Store</label>
                                        <input placeholder="Store" className={`w-full ${theme.inputBg} border-0 rounded-3xl p-5 text-[14px] font-bold outline-none ${theme.inputFocus} transition-all ${theme.text} ${isDarkMode ? 'placeholder-slate-500' : 'placeholder-slate-400'}`} value={formData.store} onChange={e => setFormData({ ...formData, store: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center justify-between ml-4 mb-1">
                                        <label className={`text-[10px] font-black uppercase ${theme.textMuted} block`}>{formData.isSale ? 'Sale Price' : 'Price'}</label>
                                        <label className="flex items-center gap-1 cursor-pointer mr-2">
                                            <span className={`text-[9px] font-black uppercase ${formData.isSale ? 'text-red-500' : theme.textMuted}`}>Sale</span>
                                            <input type="checkbox" checked={formData.isSale} onChange={e => setFormData({ ...formData, isSale: e.target.checked })} className={`w-3.5 h-3.5 rounded text-red-500 border-slate-300 accent-red-500 ${theme.inputBg}`} />
                                        </label>
                                    </div>
                                    {formData.isSale ? (
                                        <div className="flex gap-2">
                                            <div className="relative flex-1 animate-in slide-in-from-top-2">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-red-500">$</span>
                                                <input required type="number" step="0.01" placeholder="Sale" className={`w-full ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-900'} border-0 rounded-3xl p-5 pl-8 text-[14px] font-black outline-none transition-all placeholder-red-300/50`} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                            </div>
                                            <div className="relative flex-1 animate-in slide-in-from-top-2">
                                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black ${theme.textMuted}`}>$</span>
                                                <input type="number" step="0.01" placeholder="Reg" className={`w-full ${theme.inputBg} ${theme.textMuted} border-0 rounded-3xl p-5 pl-8 text-[14px] font-bold outline-none ${theme.inputFocus} transition-all line-through decoration-slate-500 ${isDarkMode ? 'placeholder-slate-600' : 'placeholder-slate-400'}`} value={formData.originalPrice} onChange={e => setFormData({ ...formData, originalPrice: e.target.value })} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-blue-600">$</span>
                                            <input required type="number" step="0.01" className={`w-full ${isDarkMode ? 'bg-blue-900/20 text-blue-400 focus:bg-blue-900/40' : 'bg-blue-50 text-blue-900 focus:bg-blue-100/50'} border-0 rounded-3xl p-5 pl-10 text-[15px] font-black outline-none transition-all`} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                        </div>
                                    )}
                                </div>

                                {formData.isSale && formData.price && formData.originalPrice && parseFloat(formData.originalPrice) > parseFloat(formData.price) && (
                                    <div className="flex justify-end pr-2 -mt-2 animate-in fade-in">
                                        <span className={`text-[10px] font-black text-red-500 ${isDarkMode ? 'bg-red-900/20 border-red-900/50' : 'bg-red-50 border-red-100'} px-3 py-1 rounded-full uppercase tracking-widest border`}>
                                            Save ${(parseFloat(formData.originalPrice) - parseFloat(formData.price)).toFixed(2)} ({Math.round(((parseFloat(formData.originalPrice) - parseFloat(formData.price)) / parseFloat(formData.originalPrice)) * 100)}%)
                                        </span>
                                    </div>
                                )}

                                <div className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'} p-6 rounded-[2.5rem] border flex items-center gap-4`}>
                                    <div className="flex-1">
                                        <label className={`text-[9px] font-black ${theme.textMuted} uppercase mb-2 block`}>Qty</label>
                                        <input type="number" className={`w-full ${theme.surface} rounded-2xl p-4 text-sm font-black ${isDarkMode ? 'shadow-none border border-slate-700' : 'shadow-sm border-0'} text-center outline-none ${theme.text}`} value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                                    </div>
                                    <div className="flex-1">
                                        <label className={`text-[9px] font-black ${theme.textMuted} uppercase mb-2 block`}>Size</label>
                                        <input type="number" step="0.001" className={`w-full ${theme.surface} rounded-2xl p-4 text-sm font-black ${isDarkMode ? 'shadow-none border border-slate-700' : 'shadow-sm border-0'} text-center outline-none ${theme.text}`} value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
                                    </div>
                                    <div className="w-24">
                                        <label className={`text-[9px] font-black ${theme.textMuted} uppercase mb-2 block`}>Unit</label>
                                        <select className={`w-full ${theme.surface} rounded-2xl p-4 text-[11px] font-black ${isDarkMode ? 'shadow-none border border-slate-700' : 'shadow-sm border-0'} outline-none cursor-pointer ${theme.text}`} value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                            {Object.keys(UNIT_CONVERSIONS).map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {!formData.isNonFood && (
                                <div className={`${isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-900'} p-6 md:p-8 rounded-[3rem] space-y-6 relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Sparkles size={60} /></div>
                                    <div className="flex justify-between items-center text-blue-400 border-b border-white/5 pb-4">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-white">Nutrition Data</span>
                                        <button
                                            type="button"
                                            onClick={() => handleAiMacros('', 'editor')}
                                            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-1.5"
                                        >
                                            ✨ AI Match
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="bg-blue-900/30 border border-blue-500/20 p-4 rounded-2xl text-center flex items-center justify-center gap-3">
                                            <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Serving:</span>
                                            <input
                                                type="number"
                                                className="w-20 bg-white/10 text-white font-black text-center rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={formData.servingSize}
                                                onChange={e => setFormData({ ...formData, servingSize: e.target.value })}
                                                onFocus={handleServingFocus}
                                                onBlur={handleServingBlur}
                                            />
                                            <span className="text-[10px] text-blue-300 font-bold uppercase">{formData.servingUnit}</span>
                                        </div>

                                        {formData.servingSize !== oldServingSize && parseFloat(formData.servingSize) > 0 && (formData.protein || formData.calories || formData.fats || formData.carbs) && (
                                            <button
                                                type="button"
                                                onClick={applyProportionalScale}
                                                className="w-full bg-blue-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top-1 hover:bg-blue-700 transition-colors"
                                            >
                                                <Scale size={12} /> Scale Macros to {formData.servingSize}{formData.servingUnit}?
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { key: 'protein', label: 'Protein (g)', icon: <Zap size={14} /> },
                                            { key: 'fats', label: 'Fats (g)', icon: <Droplets size={14} /> },
                                            { key: 'carbs', label: 'Carbs (g)', icon: <PieChart size={14} /> },
                                            { key: 'calories', label: 'Calories', icon: <Flame size={14} /> },
                                        ].map(macro => (
                                            <div key={macro.key} className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">{macro.icon} {macro.label}</label>
                                                <input type="number" step="0.1" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-black text-white outline-none focus:bg-white/10 transition-all" value={formData[macro.key]} onChange={e => setFormData({ ...formData, [macro.key]: e.target.value })} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button type="submit" className={`w-full text-white p-6 rounded-[2.5rem] text-[15px] font-black uppercase tracking-widest shadow-2xl active:scale-[0.98] transition-all ${formData.isSale ? 'bg-red-600 shadow-red-500/20 hover:bg-red-700' : 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700'}`}>
                                {viewingItem ? 'Update Database' : 'Save Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Batch Cropping Modal */}
            {isCropping && (
                <div className="fixed inset-0 z-[60] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
                    <div className={`${theme.surface} border ${theme.border} rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl relative`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex flex-col">
                                <h3 className={`font-black uppercase tracking-tighter text-lg leading-none ${theme.text}`}>Optimize Image</h3>
                                <span className="text-[10px] font-bold text-blue-600 uppercase mt-1">Item {currentQueueIndex + 1} of {batchQueue.length}</span>
                            </div>
                            <button onClick={() => setBatchQueue([])} className={`${theme.btnMuted} border p-2 rounded-full`}><X size={16} /></button>
                        </div>

                        <div className={`relative aspect-square ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-[2rem] overflow-hidden border-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} mb-6 group`}>
                            <div
                                className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
                                style={{ transform: `translate(${cropState.x}%, ${cropState.y}%) scale(${cropState.scale}) rotate(${cropState.rotate}deg)` }}
                            >
                                <img src={batchQueue[currentQueueIndex].raw} alt="Crop preview" className="max-w-none max-h-none" style={{ width: '100%' }} />
                            </div>
                            <div className="absolute inset-0 pointer-events-none border-2 border-blue-500/30 grid grid-cols-3 grid-rows-3 opacity-50">
                                <div className="border border-blue-500/10"></div><div className="border border-blue-500/10"></div><div className="border border-blue-500/10"></div>
                                <div className="border border-blue-500/10"></div><div className="border border-blue-500/10"></div><div className="border border-blue-500/10"></div>
                                <div className="border border-blue-500/10"></div><div className="border border-blue-500/10"></div><div className="border border-blue-500/10"></div>
                            </div>
                        </div>

                        <div className="space-y-6 mb-8">
                            <div className="space-y-2">
                                <div className={`flex justify-between text-[10px] font-black uppercase ${theme.textMuted}`}><span>Zoom</span><span>{Math.round(cropState.scale * 100)}%</span></div>
                                <input type="range" min="1" max="3" step="0.1" value={cropState.scale} onChange={e => setCropState({ ...cropState, scale: parseFloat(e.target.value) })} className={`w-full h-2 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg appearance-none cursor-pointer accent-blue-600`} />
                            </div>

                            {/* D-Pad Style Panning Controls */}
                            <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => setCropState({ ...cropState, y: cropState.y + 10 })} className={`${theme.btnMuted} border p-2 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1`}><ArrowDown size={14} /> Down</button>
                                <button onClick={() => setCropState({ ...cropState, y: cropState.y - 10 })} className={`${theme.btnMuted} border p-2 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1`}><ArrowUp size={14} /> Up</button>
                                <button onClick={() => setCropState({ ...cropState, x: cropState.x + 10 })} className={`${theme.btnMuted} border p-2 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1`}><ArrowRight size={14} /> Right</button>
                                <button onClick={() => setCropState({ ...cropState, x: cropState.x - 10 })} className={`${theme.btnMuted} border p-2 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1`}><ArrowLeft size={14} /> Left</button>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setCropState({ ...cropState, rotate: cropState.rotate - 90 })} className={`flex-1 ${theme.btnMuted} border p-3 rounded-xl flex items-center justify-center gap-2`}><RotateCcw size={16} /> <span className="text-[10px] font-black uppercase">Rotate</span></button>
                                <button onClick={() => setCropState({ scale: 1, rotate: 0, x: 0, y: 0 })} className={`flex-1 ${theme.btnMuted} border p-3 rounded-xl flex items-center justify-center gap-2`}><RefreshCw size={16} /> <span className="text-[10px] font-black uppercase">Reset</span></button>
                            </div>
                        </div>

                        <button onClick={applyCropAndMove} disabled={aiLoading} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                            {aiLoading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Layers size={18} /> {currentQueueIndex < batchQueue.length - 1 ? 'Next Image' : 'Start Analysis'}</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Editable Verification Modal for Imports */}
            {scanProposal && !isCropping && (
                <div className="fixed inset-0 z-[70] bg-slate-900/95 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-in fade-in text-white overflow-y-auto">
                    <div className="bg-white/10 border border-white/20 rounded-[2rem] p-6 shadow-2xl w-full max-w-sm relative mt-10 mb-10">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                            <div className="flex items-center gap-3 text-blue-400">
                                <Camera size={24} />
                                <h3 className="font-black uppercase tracking-widest text-sm">Verify Scan</h3>
                            </div>
                            {batchQueue.length > 1 && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-black">{currentQueueIndex + 1}/{batchQueue.length}</span>}
                        </div>

                        <div className="w-full h-40 bg-black/40 rounded-2xl mb-6 overflow-hidden border border-white/10 relative group">
                            <img src={scanProposal.image} alt="Scanned product" className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform" onClick={() => setFullscreenImage(scanProposal.image)} />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center justify-center transition-opacity">
                                <span className="bg-black/60 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-md"><Maximize2 size={12} /> Expand</span>
                            </div>
                        </div>

                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 text-center tracking-widest">You can edit values below</p>

                        <label className="flex items-center gap-2 cursor-pointer bg-black/20 p-3 rounded-xl border border-white/5 mb-3 w-full justify-between hover:bg-black/30 transition-colors">
                            <span className="text-[10px] uppercase font-bold text-slate-300">Is Non-Food / Household?</span>
                            <input type="checkbox" checked={scanProposal.isNonFood} onChange={e => setScanProposal({ ...scanProposal, isNonFood: e.target.checked })} className="w-4 h-4 rounded text-blue-600 border-white/10 bg-white/10" />
                        </label>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center bg-black/20 p-2 pl-4 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Product</span>
                                <input className="bg-transparent text-right font-black text-sm text-white outline-none w-2/3" value={scanProposal.name || ''} onChange={e => setScanProposal({ ...scanProposal, name: e.target.value })} />
                            </div>
                            <div className="flex justify-between items-center bg-black/20 p-2 pl-4 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Category</span>
                                <select className="bg-transparent text-right font-black text-sm text-white outline-none w-2/3 appearance-none" value={scanProposal.category || ''} onChange={e => setScanProposal({ ...scanProposal, category: e.target.value })}>
                                    {STANDARD_CATEGORIES.map(c => <option key={c} value={c} className="text-slate-900">{c}</option>)}
                                </select>
                            </div>

                            {/* Sale Toggle for AI Batch */}
                            <label className="flex items-center gap-2 cursor-pointer bg-black/20 p-2 pl-4 rounded-xl border border-white/5 w-full justify-between hover:bg-black/30 transition-colors">
                                <span className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1"><Tag size={12} /> On Sale?</span>
                                <input type="checkbox" checked={scanProposal.isSale} onChange={e => setScanProposal({ ...scanProposal, isSale: e.target.checked })} className="w-3.5 h-3.5 rounded text-red-500 border-white/10 accent-red-500 bg-white/10" />
                            </label>

                            {scanProposal.isSale ? (
                                <div className="flex gap-2">
                                    <div className="flex justify-between items-center bg-red-900/20 p-2 pl-3 rounded-xl border border-red-500/30 focus-within:border-red-500 flex-1">
                                        <span className="text-[9px] uppercase font-black text-red-400">Sale $</span>
                                        <input type="number" step="0.01" className="bg-transparent text-right font-black text-red-400 text-sm outline-none w-16" value={scanProposal.price || ''} onChange={e => setScanProposal({ ...scanProposal, price: e.target.value })} />
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-2 pl-3 rounded-xl border border-white/5 focus-within:border-blue-500/50 flex-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400">Reg $</span>
                                        <input type="number" step="0.01" className="bg-transparent text-right font-black text-slate-300 text-sm outline-none w-16 line-through" value={scanProposal.originalPrice || ''} onChange={e => setScanProposal({ ...scanProposal, originalPrice: e.target.value })} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center bg-black/20 p-2 pl-4 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Price</span>
                                    <div className="flex items-center gap-1 justify-end">
                                        <span className="font-black text-green-400 text-sm">$</span>
                                        <input type="number" step="0.01" className="bg-transparent text-right font-black text-green-400 text-sm outline-none w-24" value={scanProposal.price || ''} onChange={e => setScanProposal({ ...scanProposal, price: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center bg-black/20 p-2 pl-4 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Size / Qty</span>
                                <div className="flex items-center gap-2 justify-end w-2/3">
                                    <input type="number" className="bg-transparent text-right font-black text-sm text-white outline-none w-12" value={scanProposal.quantity || ''} onChange={e => setScanProposal({ ...scanProposal, quantity: e.target.value })} />
                                    <span className="text-slate-500 font-black text-xs">×</span>
                                    <input type="number" className="bg-transparent text-right font-black text-sm text-white outline-none w-16" value={scanProposal.weight || ''} onChange={e => setScanProposal({ ...scanProposal, weight: e.target.value })} />
                                    <input className="bg-transparent font-black text-sm text-slate-400 outline-none w-10 uppercase" value={scanProposal.unit || ''} onChange={e => setScanProposal({ ...scanProposal, unit: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-black/20 p-2 pl-4 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Store</span>
                                <input className="bg-transparent text-right font-black text-sm text-white outline-none w-1/2" value={scanProposal.store || ''} onChange={e => setScanProposal({ ...scanProposal, store: e.target.value })} />
                            </div>
                        </div>

                        {/* Batch Macro Addition - Hidden if Non-Food */}
                        {!scanProposal.isNonFood && (
                            <div className="border-t border-white/10 pt-4 mb-8">
                                <div className="flex gap-4 items-center mb-1">
                                    <span className={`text-sm font-bold line-clamp-2 md:whitespace-normal break-words pr-4 ${theme.text} flex-1`}>{scanProposal.name}</span>
                                    {scanProposal.isSale && <span className="text-[9px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded uppercase tracking-widest leading-none shrink-0 self-start mt-1">Sale</span>}
                                    <button onClick={() => { setMacroContext('batch'); handleAiMacros('', 'batch'); }} className="bg-white/10 hover:bg-white/20 text-[9px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"><Sparkles size={12} /> AI Match</button>
                                </div>

                                <div className="flex flex-col gap-2 mb-4">
                                    <div className="flex items-center justify-between bg-black/20 p-2 pl-4 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Serving</span>
                                        <div className="flex gap-2 justify-end w-1/2">
                                            <input type="number" className="bg-transparent text-right font-black text-sm text-white outline-none w-full" value={scanProposal.servingSize || ''} onChange={e => setScanProposal({ ...scanProposal, servingSize: e.target.value })} onFocus={handleServingFocus} onBlur={handleServingBlur} />
                                            <input className="bg-transparent font-black text-sm text-slate-400 outline-none w-10 uppercase" value={scanProposal.servingUnit || ''} onChange={e => setScanProposal({ ...scanProposal, servingUnit: e.target.value })} />
                                        </div>
                                    </div>
                                    {scanProposal.servingSize !== batchOldServingSize && parseFloat(scanProposal.servingSize) > 0 && (scanProposal.protein || scanProposal.calories || scanProposal.fats || scanProposal.carbs) && (
                                        <button onClick={applyProportionalScale} className="w-full bg-blue-600/30 text-blue-200 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top-1 border border-blue-500/30 hover:bg-blue-600/50 transition-colors">
                                            <Scale size={12} /> Scale Macros to {scanProposal.servingSize}{scanProposal.servingUnit}?
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex justify-between items-center bg-black/20 p-2 px-3 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                        <span className="text-[9px] uppercase font-bold text-blue-400">Pro (g)</span>
                                        <input type="number" step="0.1" className="bg-transparent text-right font-black text-sm text-white outline-none w-16" value={scanProposal.protein || ''} onChange={e => setScanProposal({ ...scanProposal, protein: e.target.value })} />
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-2 px-3 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                        <span className="text-[9px] uppercase font-bold text-orange-400">Cals</span>
                                        <input type="number" step="0.1" className="bg-transparent text-right font-black text-sm text-white outline-none w-16" value={scanProposal.calories || ''} onChange={e => setScanProposal({ ...scanProposal, calories: e.target.value })} />
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-2 px-3 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                        <span className="text-[9px] uppercase font-bold text-yellow-400">Fat (g)</span>
                                        <input type="number" step="0.1" className="bg-transparent text-right font-black text-sm text-white outline-none w-16" value={scanProposal.fats || ''} onChange={e => setScanProposal({ ...scanProposal, fats: e.target.value })} />
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-2 px-3 rounded-xl border border-white/5 focus-within:border-blue-500/50">
                                        <span className="text-[9px] uppercase font-bold text-green-400">Carb (g)</span>
                                        <input type="number" step="0.1" className="bg-transparent text-right font-black text-sm text-white outline-none w-16" value={scanProposal.carbs || ''} onChange={e => setScanProposal({ ...scanProposal, carbs: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={discardScanProposal} className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-[11px] font-black uppercase transition-colors">Discard</button>
                            <button onClick={acceptScanProposal} className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl text-[11px] font-black uppercase transition-colors flex justify-center items-center gap-2"><CheckCircle2 size={16} /> {batchQueue.length === 1 ? 'Import to Editor' : 'Save & Next'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Macro Picker Modal */}
            {showMacroPicker && (
                <div className="fixed inset-0 z-[80] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className={`${theme.surface} border ${theme.border} w-full max-w-sm rounded-[2.5rem] p-6 space-y-4 animate-in zoom-in-95`}>
                        <div className="flex justify-between items-center">
                            <h3 className={`font-black uppercase text-lg leading-none ${theme.text}`}>Refine & Pick</h3>
                            <button onClick={() => setShowMacroPicker(false)} className={`${theme.btnMuted} border p-2 rounded-xl transition-colors`}><X size={18} /></button>
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Add brand or detail..." value={macroRefinement} onChange={e => setMacroRefinement(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiMacros(macroRefinement)} className={`w-full ${theme.inputBg} ${theme.text} p-3 rounded-xl border ${theme.border} ${theme.inputFocus} outline-none text-sm`} />
                            <button onClick={() => handleAiMacros(macroRefinement)} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"><RefreshCw size={18} /></button>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
                            {macroOptions.map((m, i) => (
                                <div key={i} className={`w-full text-left p-4 ${theme.inputBg} rounded-2xl border ${theme.border} transition-all flex flex-col group relative`}>
                                    <div className="flex justify-between items-start mb-3 gap-2">
                                        <span className={`font-black text-xs uppercase ${theme.text} line-clamp-2 flex-1`}>{m.title || m.name}</span>
                                        <span className={`text-[8px] font-bold ${isDarkMode ? 'text-slate-300 bg-slate-700' : 'text-slate-500 bg-slate-200'} uppercase px-2 py-0.5 rounded-md whitespace-nowrap shrink-0`}>{m.source || 'Unknown'}</span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-500 text-center mb-3">
                                        <div className={`flex flex-col ${theme.surface} p-1.5 rounded-xl shadow-sm border ${theme.border}`}><span className="text-blue-500 font-black text-sm">{m.protein}g</span>Pro</div>
                                        <div className={`flex flex-col ${theme.surface} p-1.5 rounded-xl shadow-sm border ${theme.border}`}><span className="text-green-500 font-black text-sm">{m.carbs}g</span>Carb</div>
                                        <div className={`flex flex-col ${theme.surface} p-1.5 rounded-xl shadow-sm border ${theme.border}`}><span className="text-yellow-500 font-black text-sm">{m.fats}g</span>Fat</div>
                                        <div className={`flex flex-col ${theme.surface} p-1.5 rounded-xl shadow-sm border ${theme.border}`}><span className="text-orange-500 font-black text-sm">{m.calories}</span>Cal</div>
                                    </div>

                                    <div className={`flex items-center justify-between border-t ${theme.border} pt-3`}>
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[65%]">
                                            <div className={`${theme.blueAccentBg} ${theme.blueAccentText} px-2 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border shrink-0 shadow-sm`}>
                                                {m.servingDescription ? `${m.servingDescription} (${m.servingSize}${m.servingUnit})` : `${m.servingSize}${m.servingUnit}`}
                                            </div>
                                            {m.altServings && m.altServings.map((alt, idx) => (
                                                <button
                                                    type="button"
                                                    key={idx}
                                                    onClick={(e) => { e.stopPropagation(); applyAltServing(i, alt); }}
                                                    className={`${theme.surface} ${theme.textMuted} px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase whitespace-nowrap border ${theme.border} hover:border-blue-500 shrink-0 shadow-sm active:scale-95 transition-all`}
                                                >
                                                    {alt.desc} ({alt.size}{alt.unit})
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={() => selectMacroMatch(m)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-md hover:bg-blue-700 shadow-blue-500/20 transition-colors shrink-0">Select</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Chat / Persona Modals */}
            {isChatOpen && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setIsChatOpen(false)} />
                    <div className={`relative ${isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-900'} rounded-t-[2.5rem] p-6 w-full h-[85vh] md:h-[600px] md:max-w-md md:mx-auto md:mb-10 md:rounded-[2.5rem] shadow-2xl flex flex-col slide-in-from-bottom`}>
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                            <h2 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={18} className="text-blue-400" /> Coach Chat
                            </h2>
                            <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm shadow-lg shadow-blue-500/20' : 'bg-white/10 text-slate-200 rounded-bl-sm border border-white/5 leading-relaxed'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={callChat} className="mt-4 relative">
                            <input type="text" placeholder="Ask about macros or recovery..." value={chatInput} onChange={e => setChatInput(e.target.value)} className="w-full bg-white/10 text-white placeholder-slate-400 border border-white/10 rounded-full py-4 pl-5 pr-14 outline-none focus:bg-white/20 focus:border-white/30 transition-all text-sm" />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 text-white p-2.5 rounded-full hover:bg-blue-400 shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-50" disabled={!chatInput.trim()}>
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showPersonaSettings && (
                <div className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className={`${theme.surface} w-full max-w-md rounded-[3rem] p-8 shadow-2xl border ${theme.border}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`w-10 h-10 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-900'} rounded-2xl flex items-center justify-center text-white`}><UserCog size={20} /></div>
                            <h3 className={`text-xl font-black uppercase tracking-tighter ${theme.text}`}>AI Persona</h3>
                        </div>
                        <textarea
                            className={`w-full h-40 p-5 ${theme.inputBg} border-2 ${theme.border} rounded-3xl text-sm font-medium outline-none focus:border-blue-600 transition-all resize-none shadow-inner ${theme.text}`}
                            value={tempPersona}
                            onChange={e => setTempPersona(e.target.value)}
                        />
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowPersonaSettings(false)} className={`flex-1 ${theme.btnMuted} py-4 rounded-2xl font-black uppercase tracking-widest transition-all border`}>Cancel</button>
                            <button onClick={() => { setUserPersona(tempPersona); setShowPersonaSettings(false); }} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {showApiSettings && (
                <div className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                    <div className={`${theme.surface} w-full max-w-md rounded-[3rem] p-8 shadow-2xl border ${theme.border}`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-900'} rounded-2xl flex items-center justify-center text-white`}><Zap size={20} /></div>
                                <h3 className={`text-xl font-black uppercase tracking-tighter ${theme.text}`}>Gemini API Key</h3>
                            </div>
                            <button onClick={() => setShowApiSettings(false)} className={`${theme.btnMuted} border p-2.5 rounded-full transition-all hover:rotate-90`}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className={`flex items-center justify-between mb-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textMuted}`}>Connection Status</span>
                            {apiStatus === 'testing' ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-500"><Loader2 size={12} className="animate-spin" /> Verifying</span>
                            ) : apiStatus === 'valid' ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-1 rounded-lg"><CheckCircle2 size={12} /> Connected</span>
                            ) : apiStatus === 'invalid' ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-1 rounded-lg"><X size={12} /> Invalid</span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500"><Activity size={12} /> Idle</span>
                            )}
                        </div>
                        <p className={`text-[11px] font-black uppercase tracking-widest ${theme.textMuted} mb-4 leading-tight`}>
                            Your key is stored securely in your browser's local storage and is never sent to our servers.
                        </p>
                        <input
                            type="password"
                            placeholder="AIzaSy..."
                            className={`w-full p-5 ${theme.inputBg} border-2 ${theme.border} rounded-3xl text-sm font-medium outline-none focus:border-blue-600 transition-all shadow-inner ${theme.text}`}
                            value={tempApiKey}
                            onChange={e => setTempApiKey(e.target.value)}
                        />
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { testApiKey(tempApiKey); }} className={`flex-1 ${theme.btnMuted} py-4 rounded-2xl font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2`}><RotateCcw size={14} /> Test</button>
                            <button onClick={() => {
                                const cleanKey = tempApiKey.trim();
                                setGeminiApiKey(cleanKey);
                                localStorage.setItem('nutripricer_gemini_key', cleanKey);
                                setShowApiSettings(false);
                            }} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Save Key</button>
                        </div>
                    </div>
                </div>
            )}

            {showChangelog && (
                <div className="fixed inset-0 z-[95] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                    <div className={`${theme.surface} w-full max-w-md rounded-[3rem] p-8 shadow-2xl border ${theme.border} max-h-[85vh] flex flex-col`}>
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-900'} rounded-2xl flex items-center justify-center text-white`}><Layers size={20} /></div>
                                <h3 className={`text-xl font-black uppercase tracking-tighter ${theme.text}`}>Version History</h3>
                            </div>
                            <button onClick={() => setShowChangelog(false)} className={`${theme.btnMuted} border p-2 rounded-full transition-colors`}><X size={16} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                            {CHANGELOG.map((log, i) => (
                                <div key={i} className={`p-5 rounded-3xl border ${theme.border} ${theme.inputBg}`}>
                                    <div className={`flex items-center justify-between mb-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} pb-2`}>
                                        <span className="font-black text-blue-600 text-lg uppercase tracking-tight">v{log.version}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>{log.date}</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {log.notes.map((note, idx) => (
                                            <li key={idx} className={`text-[12px] font-medium leading-relaxed ${theme.text} flex items-start gap-2`}>
                                                <span className="text-blue-500 font-bold mt-0.5">•</span>
                                                {note}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Temporary processing status icon for AI */}
            {aiLoading && (
                <div className={`fixed top-20 right-4 z-[200] ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} backdrop-blur px-4 py-2 rounded-full shadow-lg border flex items-center gap-2`}>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className={`text-[10px] font-black ${theme.textMuted} uppercase`}>AI Processing</span>
                </div>
            )}

        </div>
    );
}