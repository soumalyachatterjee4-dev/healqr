import { useState, useEffect } from "react";
import {
  Apple,
  Plus,
  History,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Activity,
  Weight,
  Scale,
  Calendar,
  ChevronRight,
  CreditCard,
  Menu,
  Search,
  X,
  Pencil,
  Trash2,
  PlusCircle,
  Save,
  Send,
  QrCode as QrIcon,
} from "lucide-react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, app } from "../lib/firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClinicSidebar from "./ClinicSidebar";

interface ClinicAIDietChartManagerProps {
  clinicId: string;
  clinicName: string;
  onLogout: () => void;
  onMenuChange: (menu: string) => void;
  activeAddOns: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  isFlowingFromRX?: boolean;
  onComplete?: (dietLink: string) => void;
  doctorInfo?: {
    name: string;
    degree: string;
    degrees?: string[];
    specialty: string;
    specialities?: string[];
    qrNumber?: string;
    clinicName?: string;
    doctorId: string;
    address?: string;
    timing?: string;
    registrationNumber?: string;
    showRegistrationOnRX?: boolean;
    useDrPrefix?: boolean;
  };
}

interface DietChartHistoryItem {
  id: string;
  patientName: string;
  phone: string;
  age: string;
  gender: string;
  conditions: string;
  region: string;
  isSmoker: boolean;
  isAlcoholic: boolean;
  remarks?: string;
  date: string;
  timestamp: number;
  plan?: {
    day: number;
    meals: {
      type: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
      items: { name: string; weight: string; kcal: string }[];
    }[];
  }[];
}

export default function ClinicAIDietChartManager({
  clinicId,
  clinicName,
  onLogout,
  onMenuChange,
  activeAddOns,
  isSidebarCollapsed = false,
  setIsSidebarCollapsed,
  isFlowingFromRX,
  onComplete,
  doctorInfo,
}: ClinicAIDietChartManagerProps) {
  const [usageCount, setUsageCount] = useState(0);
  const [maxFreeUsage] = useState(3);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedChart, setSelectedChart] =
    useState<DietChartHistoryItem | null>(null);
  const [editingSection, setEditingSection] = useState<{
    day: number;
    mealType: string;
  } | null>(null);
  const [tempPlan, setTempPlan] = useState<any>(null);

  // Remarks Editing State
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [tempRemarks, setTempRemarks] = useState("");

  // Local state check for robustness in case prop drilling is delayed
  const [localFlowingRX, setLocalFlowingRX] = useState<boolean>(
    isFlowingFromRX || false,
  );

  useEffect(() => {
    // Check localStorage explicitly on mount/render to act as an ultimate fallback
    const savedLink = localStorage.getItem("pending_rx_link");
    if (savedLink) {
      setLocalFlowingRX(true);
    }
  }, []);

  // Sync prop changes if they do come down correctly
  useEffect(() => {
    if (isFlowingFromRX) setLocalFlowingRX(true);
  }, [isFlowingFromRX]);

  const [historyItems, setHistoryItems] = useState<DietChartHistoryItem[]>(
    () => {
      const saved = localStorage.getItem(
        `healqr_clinic_diet_history_${clinicId}`,
      );
      return saved ? JSON.parse(saved) : [];
    },
  );
  const maxFreeUsage = 10;

  // Derive usageCount from historyItems (current month only)
  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    const monthlyItems = historyItems.filter((item) => {
      if (!item.date) return false;
      const parts = item.date.split("/");
      if (parts.length !== 3) return false;
      const [, month, year] = parts.map(Number);
      return month === currentMonth && year === currentYear;
    });

    setUsageCount(monthlyItems.length);
  }, [historyItems]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem(
      `healqr_clinic_diet_history_${clinicId}`,
      JSON.stringify(historyItems),
    );
  }, [historyItems, clinicId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedChart) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedChart]);

  // Check for pre-filled patient data from localStorage
  useEffect(() => {
    const prefilledData = localStorage.getItem("prefilled_diet_patient");
    if (prefilledData) {
      try {
        const patient = JSON.parse(prefilledData);
        setPatientData((prev) => ({
          ...prev,
          name: patient.name || "",
          age: patient.age ? String(patient.age) : "",
          gender: patient.gender ? patient.gender.toLowerCase() : "male",
          phone: patient.phone || "",
        }));
        setActiveTab("create");
        // Clear the data so it doesn't persist on refresh
        localStorage.removeItem("prefilled_diet_patient");
      } catch (error) {
        console.error("Error parsing prefilled patient data:", error);
      }
    }
  }, []);

  // Form state
  const [patientData, setPatientData] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "male",
    weight: "",
    height: "",
    activityLevel: "moderate",
    conditions: "",
    preferences: "",
    region: "West Bengal",
    isSmoker: false,
    isAlcoholic: false,
    remarks: "",
  });

  // Simulated chart generation
  const handleGenerate = async () => {
    if (!patientData.name || !patientData.age || !patientData.conditions) {
      toast.error("Required fields missing", {
        description:
          'Please fill in Name, Age, and Medical Conditions. If none, please mention "None".',
      });
      return;
    }

    setIsGenerating(true);

    // Simulate AI thinking process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Generate a structured 7-day plan (Mock logic for now, but detailed as requested)
    const generateDetailedPlan = (region: string) => {
      const days = [];
      for (let i = 1; i <= 7; i++) {
        days.push({
          day: i,
          meals: [
            {
              type: "Breakfast" as const,
              items: [
                { name: "Oats with Milk", weight: "50 GM", kcal: "180 KCAL" },
                { name: "Boiled Egg", weight: "1 unit", kcal: "70 KCAL" },
              ],
            },
            {
              type: "Lunch" as const,
              items:
                region === "West Bengal"
                  ? [
                      {
                        name: "Rice (Red/Brown)",
                        weight: "50 GM",
                        kcal: "100 KCAL",
                      },
                      {
                        name: "Boiled Spinach+Carrot",
                        weight: "100 GM",
                        kcal: "200 KCAL",
                      },
                      {
                        name: "Fish (Steamed/Grilled)",
                        weight: "75 GM",
                        kcal: "200 KCAL",
                      },
                      {
                        name: "Mishti (Low GI/Stevia)",
                        weight: "20 GM",
                        kcal: "80 KCAL",
                      },
                    ]
                  : [
                      {
                        name: "Multigrain Roti",
                        weight: "2 units",
                        kcal: "140 KCAL",
                      },
                      {
                        name: "Dal (Lentils)",
                        weight: "100 GM",
                        kcal: "120 KCAL",
                      },
                      {
                        name: "Mixed Veggies",
                        weight: "100 GM",
                        kcal: "150 KCAL",
                      },
                      { name: "Curd", weight: "50 GM", kcal: "50 KCAL" },
                    ],
            },
            {
              type: "Snacks" as const,
              items: [
                {
                  name: "Roasted Foxnuts (Makhana)",
                  weight: "20 GM",
                  kcal: "70 KCAL",
                },
                { name: "Green Tea", weight: "1 Cup", kcal: "0 KCAL" },
              ],
            },
            {
              type: "Dinner" as const,
              items: [
                { name: "Vegetable Soup", weight: "150 ML", kcal: "90 KCAL" },
                {
                  name: "Grilled Paneer/Chicken",
                  weight: "50 GM",
                  kcal: "130 KCAL",
                },
              ],
            },
          ],
        });
      }
      return days;
    };

    const newChart: DietChartHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      patientName: patientData.name,
      phone: patientData.phone,
      age: patientData.age,
      gender: patientData.gender,
      conditions: patientData.conditions,
      region: patientData.region,
      isSmoker: patientData.isSmoker,
      isAlcoholic: patientData.isAlcoholic,
      remarks: patientData.remarks,
      date: new Date().toLocaleDateString("en-GB"),
      timestamp: Date.now(),
      plan: generateDetailedPlan(patientData.region),
    };

    setHistoryItems((prev) => [newChart, ...prev]);
    setIsGenerating(false);
    setUsageCount((prev) => prev + 1);
    toast.success("AI Diet Chart generated successfully!");
    setSelectedChart(newChart); // Auto-open modal after generation
  };

  const handleCloseReport = () => {
    setTempPlan(null);
    setEditingSection(null);
  };

  const handleStartEditRemarks = () => {
    if (!selectedChart) return;
    setTempRemarks(selectedChart.remarks || "");
    setIsEditingRemarks(true);
  };

  const handleCancelEditRemarks = () => {
    setIsEditingRemarks(false);
    setTempRemarks("");
  };

  const handleSaveRemarks = async () => {
    if (!selectedChart || !clinicId) return;

    try {
      const updatedChart = { ...selectedChart, remarks: tempRemarks };

      // Update local state
      setSelectedChart(updatedChart);

      const newHistory = historyItems.map((item) =>
        item.id === selectedChart.id ? updatedChart : item,
      );
      setHistoryItems(newHistory);

      // Save to Firestore
      const docRef = doc(db!, "clinics", clinicId);
      await updateDoc(docRef, {
        dietChartHistory: newHistory,
        updatedAt: serverTimestamp(),
      });

      setIsEditingRemarks(false);
      toast.success("Remarks updated successfully");
    } catch (error) {
      console.error("Error saving remarks:", error);
      toast.error("Failed to update remarks");
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedChart) return;
    setIsGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { getStorage, ref, uploadBytes, getDownloadURL } =
        await import("firebase/storage");
      const { app } = await import("../lib/firebase/config");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // --- ENRICHED HEADER (SS3 STYLE) ---
      // Doctor Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // zinc-800
      const drName =
        (doctorInfo?.useDrPrefix ?? true)
          ? `DR. ${doctorInfo?.name || clinicName}`
          : (doctorInfo?.name || clinicName).toUpperCase();
      doc.text(drName, 20, 25);

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // zinc-600
      const degreesStr =
        doctorInfo?.degrees?.join("  •  ") ||
        doctorInfo?.degree ||
        "Medical Professional";
      doc.text(degreesStr, 20, 32);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text(
        (
          doctorInfo?.specialities?.join(" • ") ||
          doctorInfo?.specialty ||
          "General Physician"
        ).toUpperCase(),
        20,
        39,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100);
      if (doctorInfo?.registrationNumber) {
        doc.text(`REG NO: ${doctorInfo.registrationNumber}`, 20, 45);
      }

      // Clinic Info (Bottom Left of Header)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text((doctorInfo?.clinicName || clinicName).toUpperCase(), 20, 55);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100);
      if (doctorInfo?.address) {
        const addressLines = doc.splitTextToSize(doctorInfo.address, 70);
        doc.text(addressLines, 20, 60);
      }
      if (doctorInfo?.timing) {
        doc.setFont("helvetica", "italic");
        const timingY = doctorInfo?.address
          ? 60 + doc.splitTextToSize(doctorInfo.address, 70).length * 4
          : 60;
        doc.text(doctorInfo.timing, 20, timingY);
        doc.setFont("helvetica", "normal");
      }

      // QR Code Placeholder Area
      doc.setDrawColor(220);
      doc.roundedRect(pageWidth - 50, 20, 30, 30, 3, 3);
      try {
        const qrContent = doctorInfo?.qrNumber
          ? `healqr:${doctorInfo.qrNumber}`
          : `healqr:doctor:${doctorInfo?.doctorId || clinicId}`;
        const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1 });
        doc.addImage(qrDataUrl, "PNG", pageWidth - 48, 22, 26, 26);
      } catch (e) {
        doc.setTextColor(200);
        doc.setFontSize(8);
        doc.text("SCAN QR", pageWidth - 35, 35, { align: "center" });
      }

      // --- PATIENT MINIMAL STRIPE ---
      doc.setFillColor(248, 250, 252); // zinc-50
      doc.rect(20, 85, pageWidth - 40, 15, "F");
      doc.setDrawColor(226, 232, 240); // zinc-200
      doc.line(20, 85, pageWidth - 20, 85);
      doc.line(20, 100, pageWidth - 20, 100);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // zinc-400
      doc.text("PATIENT", 25, 91);
      doc.text("PHONE", 75, 91);
      doc.text("AGE/SEX", 125, 91);
      doc.text("DATE", pageWidth - 45, 91);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(selectedChart.patientName.toUpperCase(), 25, 96);
      doc.text(selectedChart.phone || "NA", 75, 96);
      doc.text(
        `${selectedChart.age}Y/${selectedChart.gender.substring(0, 1).toUpperCase()}`,
        125,
        96,
      );
      doc.setTextColor(37, 99, 235);
      doc.text(selectedChart.date, pageWidth - 45, 96);

      // --- AI DIET CHART SUB-HEADING ---
      let currentY = 115;
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text("AI DIET CHART", pageWidth / 2, currentY, {
        align: "center",
        charSpace: 2,
      });
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("PRECISION NUTRITION STRATEGY", pageWidth / 2, currentY + 5, {
        align: "center",
        charSpace: 1,
      });
      currentY += 15;

      // --- SPECIAL INSTRUCTIONS ---
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(20, currentY, pageWidth - 40, 20, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text("SPECIAL INSTRUCTIONS / REMARKS", 25, currentY + 6);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const remarksLines = doc.splitTextToSize(
        selectedChart.remarks || "No additional remarks provided.",
        pageWidth - 50,
      );
      doc.text(remarksLines, 25, currentY + 12);
      currentY += 30;

      // --- DIET PLAN ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text("7-DAY NUTRITIONAL STRATEGY", 20, currentY);
      currentY += 10;

      selectedChart.plan?.forEach((day) => {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFillColor(241, 245, 249);
        doc.rect(20, currentY, pageWidth - 40, 8, "F");
        doc.text(`DAY ${day.day}`, 25, currentY + 6);
        currentY += 12;

        const colWidth = (pageWidth - 50) / 2;
        day.meals.forEach((meal, mIdx) => {
          const xPos = mIdx % 2 === 0 ? 25 : 25 + colWidth + 5;
          const initialMealY = currentY;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235);
          doc.text(meal.type.toUpperCase(), xPos, currentY);
          let mealY = currentY + 5;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          meal.items.forEach((item) => {
            const itemText = `${item.name} (${item.weight})`;
            const wrappedItem = doc.splitTextToSize(itemText, colWidth - 15);
            doc.text(wrappedItem, xPos + 2, mealY);
            doc.setTextColor(37, 99, 235);
            doc.text(item.kcal, xPos + colWidth - 10, mealY, {
              align: "right",
            });
            doc.setTextColor(71, 85, 105);
            mealY += wrappedItem.length * 4;
          });

          if (mIdx % 2 !== 0 || mIdx === day.meals.length - 1) {
            currentY = Math.max(currentY, mealY) + 5;
          }
        });
        currentY += 5;
      });

      // --- FOOTER ---
      const addFooter = (pDoc: any) => {
        const pWidth = pDoc.internal.pageSize.getWidth();
        const pHeight = pDoc.internal.pageSize.getHeight();
        pDoc.setFont("helvetica", "bold");
        pDoc.setFontSize(10);
        pDoc.setTextColor(30, 41, 59);
        pDoc.text(
          `Guided by ${(doctorInfo?.useDrPrefix ?? true) ? "Dr. " : ""}${doctorInfo?.name || clinicName}`,
          pWidth / 2,
          pHeight - 20,
          { align: "center" },
        );

        pDoc.setFont("helvetica", "normal");
        pDoc.setFontSize(8);
        pDoc.setTextColor(148, 163, 184);
        pDoc.text(
          "POWERED BY WWW.HEALQR.COM   •   GENERATED BY GEMINI FLASH 1.5",
          pWidth / 2,
          pHeight - 12,
          { align: "center", charSpace: 1 },
        );
      };

      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addFooter(doc);
      }

      // Download PDF
      doc.save(
        `Diet_Chart_${selectedChart.patientName.replace(/\s+/g, "_")}.pdf`,
      );

      const pdfBlob = doc.output("blob");
      const fileName = `diet_${selectedChart.id}_${Date.now()}.pdf`;
      const storagePath = `diet-charts/${patientData.phone || "unregistered"}/${fileName}`;
      const storageRef = ref(getStorage(app!), storagePath);
      await uploadBytes(storageRef, pdfBlob);
      const downloadURL = await getDownloadURL(storageRef);

      toast.success("AI Diet Chart finalized and uploaded!");
      if (onComplete) {
        onComplete(downloadURL);
      }
    } catch (error) {
      console.error("Error generating Diet PDF:", error);
      toast.error("Failed to generate Diet Chart PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEdit = (day: number, mealType: string) => {
    if (!selectedChart) return;
    setTempPlan(JSON.parse(JSON.stringify(selectedChart.plan || [])));
    setEditingSection({ day, mealType });
  };

  const handleSaveMealItems = () => {
    if (!selectedChart) return;

    const updatedPlan = tempPlan;
    const updatedChart = { ...selectedChart, plan: updatedPlan };
    setSelectedChart(updatedChart);

    // Update history
    const updatedHistory = historyItems.map((item) =>
      item.id === selectedChart.id ? updatedChart : item,
    );
    setHistoryItems(updatedHistory);
    localStorage.setItem(
      `healqr_clinic_diet_history_${clinicId}`,
      JSON.stringify(updatedHistory),
    );

    setEditingSection(null);
    toast.success("Meal plan updated successfully");
  };

  const handleAddItem = (day: number, mealType: string) => {
    setTempPlan((prev) => {
      const newPlan = [...(prev || [])];
      const dayPlan = newPlan.find((d) => d.day === day);
      if (dayPlan) {
        const meal = dayPlan.meals.find((m) => m.type === mealType);
        if (meal) {
          meal.items.push({ name: "New Item", weight: "0 GM", kcal: "0 KCAL" });
        }
      }
      return newPlan;
    });
  };

  const handleDeleteItem = (day: number, mealType: string, itemIdx: number) => {
    setTempPlan((prev) => {
      const newPlan = [...(prev || [])];
      const dayPlan = newPlan.find((d) => d.day === day);
      if (dayPlan) {
        const meal = dayPlan.meals.find((m) => m.type === mealType);
        if (meal) {
          meal.items.splice(itemIdx, 1);
        }
      }
      return newPlan;
    });
  };

  const handleUpdateItem = (
    day: number,
    mealType: string,
    itemIdx: number,
    field: string,
    value: string,
  ) => {
    setTempPlan((prev) => {
      const newPlan = JSON.parse(JSON.stringify(prev || []));
      const dayPlan = newPlan.find((d: any) => d.day === day);
      if (dayPlan) {
        const meal = dayPlan.meals.find((m: any) => m.type === mealType);
        if (meal) {
          meal.items[itemIdx] = { ...meal.items[itemIdx], [field]: value };
        }
      }
      return newPlan;
    });
  };

  const filteredHistory = historyItems.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery);

    const itemDate = new Date(item.timestamp);
    const matchesDateFrom = !dateFrom || itemDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || itemDate <= new Date(dateTo + "T23:59:59");

    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <ClinicSidebar
        activeMenu="ai-diet-chart"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeAddOns={activeAddOns}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
      />

      <main
        className={`flex-1 transition-all duration-300 flex flex-col min-h-screen ${isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        <header className="bg-black border-b border-zinc-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-blue-500" />
            </button>

            <button
              onClick={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
              className="hidden lg:flex w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg items-center justify-center transition-colors mr-2"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight
                className={`w-5 h-5 text-blue-500 transition-transform duration-300 ${isSidebarCollapsed ? "" : "rotate-180"}`}
              />
            </button>

            <Apple className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg md:text-xl font-semibold">
              AI Driven Diet Chart
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1 inline" />
              AI Powered
            </Badge>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
          {/* Main Action Tabs */}
          <div className="flex p-1 bg-zinc-900 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "create"
                  ? "bg-black text-white shadow-lg"
                  : "text-white hover:text-white"
              }`}
            >
              <Plus className="w-4 h-4" />
              Create New Chart
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "history"
                  ? "bg-black text-white shadow-lg"
                  : "text-white hover:text-white"
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>

          {activeTab === "create" ? (
            <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Patient Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Personal Info */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">
                          Patient Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                          <input
                            type="text"
                            placeholder="Enter full name"
                            className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={patientData.name}
                            onChange={(e) =>
                              setPatientData({
                                ...patientData,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">
                          Phone Number
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                          <input
                            type="tel"
                            placeholder="Enter phone number"
                            className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={patientData.phone}
                            onChange={(e) =>
                              setPatientData({
                                ...patientData,
                                phone: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">
                          Age
                        </label>
                        <div className="relative group">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                          <input
                            type="number"
                            placeholder="Years"
                            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={patientData.age}
                            onChange={(e) =>
                              setPatientData({
                                ...patientData,
                                age: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">
                          Gender
                        </label>
                        <select
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                          value={patientData.gender}
                          onChange={(e) =>
                            setPatientData({
                              ...patientData,
                              gender: e.target.value,
                            })
                          }
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">
                          Weight (kg)
                        </label>
                        <div className="relative group">
                          <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                          <input
                            type="number"
                            placeholder="e.g. 70"
                            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={patientData.weight}
                            onChange={(e) =>
                              setPatientData({
                                ...patientData,
                                weight: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">
                          Height (cm)
                        </label>
                        <div className="relative group">
                          <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                          <input
                            type="number"
                            placeholder="e.g. 175"
                            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={patientData.height}
                            onChange={(e) =>
                              setPatientData({
                                ...patientData,
                                height: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medical Info */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">
                        Activity Level
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["sedentary", "moderate", "active"].map((level) => (
                          <button
                            key={level}
                            onClick={() =>
                              setPatientData({
                                ...patientData,
                                activityLevel: level,
                              })
                            }
                            className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all border ${
                              patientData.activityLevel === level
                                ? "bg-blue-500/20 border-blue-500 text-blue-400"
                                : "bg-black border-zinc-800 text-white hover:border-zinc-700"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        Medical Conditions / Complaints
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 border-red-500/50 text-red-400 bg-red-500/5"
                        >
                          Mandatory
                        </Badge>
                      </label>
                      <textarea
                        placeholder="Mention 'None' if applicable. e.g. Diabetes, Hypertension..."
                        className="w-full h-24 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                        value={patientData.conditions}
                        onChange={(e) =>
                          setPatientData({
                            ...patientData,
                            conditions: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-medium text-white">
                        Dietary Preferences & Lifestyle
                      </label>
                      <textarea
                        placeholder="e.g. Vegetarian, No Dairy, High Protein..."
                        className="w-full h-16 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none mb-2"
                        value={patientData.preferences}
                        onChange={(e) =>
                          setPatientData({
                            ...patientData,
                            preferences: e.target.value,
                          })
                        }
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[12px] text-white">
                            Regional Culture
                          </label>
                          <select
                            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
                            value={patientData.region}
                            onChange={(e) =>
                              setPatientData({
                                ...patientData,
                                region: e.target.value,
                              })
                            }
                          >
                            <option value="West Bengal">West Bengal</option>
                            <option value="North India">North India</option>
                            <option value="South India">South India</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="General Indian">
                              General Indian
                            </option>
                          </select>
                        </div>

                        <div className="flex items-center gap-4 pt-6">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div
                              onClick={() =>
                                setPatientData({
                                  ...patientData,
                                  isSmoker: !patientData.isSmoker,
                                })
                              }
                              className={`w-10 h-5 rounded-full transition-colors relative ${patientData.isSmoker ? "bg-blue-500" : "bg-zinc-800"}`}
                            >
                              <div
                                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${patientData.isSmoker ? "left-6" : "left-1"}`}
                              />
                            </div>
                            <span className="text-xs text-white">
                              Smoker
                            </span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div
                              onClick={() =>
                                setPatientData({
                                  ...patientData,
                                  isAlcoholic: !patientData.isAlcoholic,
                                })
                              }
                              className={`w-10 h-5 rounded-full transition-colors relative ${patientData.isAlcoholic ? "bg-blue-500" : "bg-zinc-800"}`}
                            >
                              <div
                                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${patientData.isAlcoholic ? "left-6" : "left-1"}`}
                              />
                            </div>
                            <span className="text-xs text-white">
                              Alcoholic
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Special Instructions / Remarks (🆕 Phase 20) */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Special Instructions / Remarks
                    </label>
                    <textarea
                      placeholder="e.g. Avoid sugar, specific allergies, include more seasonal fruits, etc."
                      className="w-full h-24 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      value={patientData.remarks}
                      onChange={(e) =>
                        setPatientData({
                          ...patientData,
                          remarks: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-12 flex flex-col items-center">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="h-16 !px-[80px] bg-blue-500 hover:bg-blue-600 text-white rounded-full !text-[16px] font-bold shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all group overflow-hidden relative min-w-max"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-3 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        AI is crafting the chart...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 whitespace-nowrap">
                        <Sparkles className="w-5 h-5 transition-transform group-hover:scale-125 group-hover:rotate-12" />
                        Generate AI Diet Chart
                      </span>
                    )}
                  </Button>
                  <p className="mt-4 text-xs text-white max-w-sm text-center">
                    HealQR AI analysis takes into account 25+ biometric markers
                    and medical associations. Result may vary based on data
                    accuracy.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* History Tab */
            <div className="space-y-6">
              {/* Search and Filters */}
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                <div className="md:col-span-2 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                    <input
                      type="text"
                      placeholder="Search Name or Phone..."
                      className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button className="bg-blue-500 hover:bg-blue-600 h-9 px-4 rounded-lg text-xs font-bold whitespace-nowrap">
                    Search
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white whitespace-nowrap">
                    From:
                  </span>
                  <input
                    type="date"
                    className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white whitespace-nowrap">
                    To:
                  </span>
                  <input
                    type="date"
                    className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              {historyItems.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
                  <History className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-white">
                    No chart generation history found.
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setActiveTab("create")}
                    className="text-blue-500 mt-2"
                  >
                    Start your first generation
                  </Button>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-white">
                    No records match your filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedChart(item)}
                      className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">
                            {item.patientName}
                          </h4>
                          <p className="text-xs text-white">
                            {item.phone && `${item.phone} â€¢ `}
                            {item.conditions.length > 20
                              ? `${item.conditions.substring(0, 20)}...`
                              : item.conditions}
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-1">
                            Generated: {item.date}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full text-white hover:text-white hover:bg-zinc-800"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Educational / Feature Highlight Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            {[
              {
                icon: Activity,
                title: "Nutritional Harmony",
                desc: "Balanced macros tailored to specific metabolic rates.",
              },
              {
                icon: AlertCircle,
                title: "Medical Compliance",
                desc: "Intelligent filtering for common allergies and contraindications.",
              },
              {
                icon: History,
                title: "7-Day Precision",
                desc: "Complete week-long planning to ensure long-term adherence.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
              >
                <div className="mt-1">
                  <feature.icon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h5 className="font-semibold text-white text-sm mb-1">
                    {feature.title}
                  </h5>
                  <p className="text-xs text-white leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-auto py-8 text-center border-t border-zinc-900">
          <p className="text-xs text-white flex items-center justify-center gap-2">
            AI Diet Advisor v1.0
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            Empowering Preventive Care
          </p>
        </footer>
      </main>

      {/* Report Viewer Modal - Rendering at the end for proper Stacking Context */}
      {selectedChart && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <Card className="w-full max-w-2xl bg-[#0f172a] border-zinc-800 shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-3xl">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                <Apple className="w-6 h-6 text-emerald-500" />
                <h3 className="text-xl font-bold text-white">Patient Diet Report</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseReport}
                className="rounded-full hover:bg-zinc-800"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-zinc-950">
              {/* Enriched Header (SS3 Style) */}
              <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 space-y-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  {/* Left Side: Doctor info - Compact on mobile */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                          {doctorInfo?.useDrPrefix
                            ? `Dr. ${doctorInfo.name}`
                            : doctorInfo?.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] py-0"
                        >
                          Verified
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-white uppercase tracking-wider">
                        <span>
                          {doctorInfo?.degrees?.join(", ") ||
                            doctorInfo?.degree}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 hidden sm:block" />
                        <span className="text-blue-500">
                          {doctorInfo?.specialities?.join(", ") ||
                            doctorInfo?.specialty}
                        </span>
                      </div>
                      {doctorInfo?.registrationNumber && (
                        <p className="text-[10px] text-white">
                          REG NO: {doctorInfo.registrationNumber}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                      <p className="text-sm font-bold text-zinc-300">
                        {doctorInfo?.clinicName || ""}
                      </p>
                      {doctorInfo?.address && (
                        <p className="text-xs text-white leading-relaxed max-w-xs">
                          {doctorInfo.address}
                        </p>
                      )}
                      {doctorInfo?.timing && (
                        <p className="text-[10px] text-white italic">
                          {doctorInfo.timing}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: QR Code - Scaling for mobile */}
                  <div className="flex flex-col items-center md:items-end gap-3 self-center md:self-start">
                    <div className="p-2 sm:p-3 bg-white rounded-2xl shadow-xl">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-zinc-100 flex items-center justify-center rounded-lg border border-zinc-200">
                        <QrIcon className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-300" />
                      </div>
                    </div>
                    <p className="text-[8px] text-white font-bold uppercase tracking-widest text-center">
                      Scan for next appointment
                    </p>
                  </div>
                </div>

                {/* Patient Minimal Stripe */}
                <div className="pt-6 border-t border-zinc-800/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-white text-[10px] uppercase tracking-wider font-bold">
                        Patient Name
                      </label>
                      <p className="text-white font-black">
                        {selectedChart.patientName}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-white text-[10px] uppercase tracking-wider font-bold">
                        Phone Number
                      </label>
                      <p className="text-white font-black">
                        {selectedChart.phone || "NA"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-white text-[10px] uppercase tracking-wider font-bold">
                        Age / Sex
                      </label>
                      <p className="text-white font-black">
                        {selectedChart.age}Y /{" "}
                        {selectedChart.gender?.substring(0, 1).toUpperCase()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-white text-[10px] uppercase tracking-wider font-bold">
                        Report Date
                      </label>
                      <p className="text-blue-500 font-black">
                        {selectedChart.date}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SS3 Sub Heading */}
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="h-px w-24 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                  <h2 className="text-2xl font-black text-white tracking-[0.2em] uppercase text-center flex items-center gap-4">
                    <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                    AI Diet Chart
                    <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                  </h2>
                  <p className="text-[10px] text-white font-medium tracking-widest uppercase">
                    Precision Nutrition Strategy
                  </p>
                  <div className="h-px w-24 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                </div>

                {/* Special Instructions Display Area */}
                <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Special Instructions / Remarks
                    </h5>
                    {!isEditingRemarks ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-white hover:text-white"
                        onClick={handleStartEditRemarks}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg hover:bg-blue-500/20 text-blue-400"
                          onClick={handleSaveRemarks}
                        >
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-white hover:text-white"
                          onClick={handleCancelEditRemarks}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingRemarks ? (
                    <textarea
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-blue-500 min-h-[100px] outline-none"
                      value={tempRemarks}
                      onChange={(e) => setTempRemarks(e.target.value)}
                      placeholder="Enter special instructions or remarks..."
                    />
                  ) : (
                    <p className="text-white text-base font-bold leading-relaxed italic bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
                      {selectedChart.remarks ||
                        "No additional remarks provided."}
                    </p>
                  )}
                </div>

                {/* AI Content - Detailed Structure */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-blue-500 font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      7-Day Nutritional Strategy
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-blue-500 border-blue-500/30 bg-blue-500/5"
                    >
                      ~1800-2200 kcal/day
                    </Badge>
                  </div>

                  <div className="space-y-8">
                    {(editingSection ? tempPlan : selectedChart.plan) ? (
                      (editingSection ? tempPlan : selectedChart.plan)?.map(
                        (dayData) => (
                          <div key={dayData.day} className="space-y-4">
                            <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3 py-1 bg-emerald-500/5">
                              <h5 className="text-white font-bold text-base uppercase tracking-widest">
                                Day {dayData.day}
                              </h5>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {dayData.meals.map((meal, mIdx) => {
                                const isEditing =
                                  editingSection?.day === dayData.day &&
                                  editingSection?.mealType === meal.type;

                                return (
                                  <div
                                    key={mIdx}
                                    className={`bg-zinc-900 p-5 rounded-2xl border transition-all ${
                                      isEditing
                                        ? "border-blue-500 ring-1 ring-blue-500/20"
                                        : "border-zinc-800 hover:border-blue-500/30"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                            meal.type === "Breakfast"
                                              ? "bg-orange-500/10"
                                              : meal.type === "Lunch"
                                                ? "bg-blue-500/10"
                                                : meal.type === "Snacks"
                                                  ? "bg-yellow-500/10"
                                                  : "bg-indigo-500/10"
                                          }`}
                                        >
                                          <span
                                            className={`text-[10px] font-bold ${
                                              meal.type === "Breakfast"
                                                ? "text-orange-500"
                                                : meal.type === "Lunch"
                                                  ? "text-blue-500"
                                                  : meal.type === "Snacks"
                                                    ? "text-yellow-500"
                                                    : "text-indigo-500"
                                            }`}
                                          >
                                            {meal.type === "Breakfast"
                                              ? "BF"
                                              : meal.type === "Lunch"
                                                ? "LN"
                                                : meal.type === "Snacks"
                                                  ? "SN"
                                                  : "DN"}
                                          </span>
                                        </div>
                                        <h6 className="font-bold text-white text-[11px] uppercase tracking-wider">
                                          {meal.type}
                                        </h6>
                                      </div>

                                      {!isEditing ? (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-white hover:text-white"
                                          onClick={() =>
                                            handleStartEdit(
                                              dayData.day,
                                              meal.type,
                                            )
                                          }
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                      ) : (
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg hover:bg-blue-500/20 text-blue-400"
                                            onClick={handleSaveMealItems}
                                          >
                                            <Save className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-white hover:text-white"
                                            onClick={() =>
                                              setEditingSection(null)
                                            }
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-3">
                                      {meal.items.map((item, iIdx) => (
                                        <div
                                          key={iIdx}
                                          className="group relative"
                                        >
                                          {isEditing ? (
                                            <div className="space-y-2 pb-3 border-b border-zinc-800/50 last:border-0 last:pb-0">
                                              <div className="flex gap-2">
                                                <input
                                                  className="flex-1 bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:border-blue-500"
                                                  value={item.name}
                                                  onChange={(e) =>
                                                    handleUpdateItem(
                                                      dayData.day,
                                                      meal.type,
                                                      iIdx,
                                                      "name",
                                                      e.target.value,
                                                    )
                                                  }
                                                  placeholder="Food name"
                                                />
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 text-zinc-600 hover:text-red-500"
                                                  onClick={() =>
                                                    handleDeleteItem(
                                                      dayData.day,
                                                      meal.type,
                                                      iIdx,
                                                    )
                                                  }
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                              <div className="flex gap-2">
                                                <input
                                                  className="w-1/2 bg-black border border-zinc-800 rounded px-2 py-1 text-[10px] text-white"
                                                  value={item.weight}
                                                  onChange={(e) =>
                                                    handleUpdateItem(
                                                      dayData.day,
                                                      meal.type,
                                                      iIdx,
                                                      "weight",
                                                      e.target.value,
                                                    )
                                                  }
                                                  placeholder="Quantity"
                                                />
                                                <input
                                                  className="w-1/2 bg-black border border-zinc-800 rounded px-2 py-1 text-[10px] text-blue-500"
                                                  value={item.kcal}
                                                  onChange={(e) =>
                                                    handleUpdateItem(
                                                      dayData.day,
                                                      meal.type,
                                                      iIdx,
                                                      "kcal",
                                                      e.target.value,
                                                    )
                                                  }
                                                  placeholder="Calories"
                                                />
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex justify-between items-start gap-2 border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                              <div className="flex-1">
                                                <p className="text-sm font-medium text-white">
                                                  {item.name}
                                                </p>
                                                <p className="text-[10px] text-white font-medium">
                                                  {item.weight}
                                                </p>
                                              </div>
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                              >
                                                {item.kcal}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                      ))}

                                      {isEditing && (
                                        <Button
                                          variant="ghost"
                                          className="w-full flex items-center gap-2 py-2 text-[10px] text-white hover:text-blue-500 hover:bg-blue-500/5 mt-2 border border-dashed border-zinc-800"
                                          onClick={() =>
                                            handleAddItem(
                                              dayData.day,
                                              meal.type,
                                            )
                                          }
                                        >
                                          <PlusCircle className="w-3 h-3" />
                                          Add Item
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ),
                      )
                    ) : (
                      <p className="text-white text-center italic">
                        Detailed day-wise plan not available for this legacy
                        record.
                      </p>
                    )}
                  </div>

                  {/* Patient Lifestyle Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-xl border flex items-center gap-3 ${selectedChart.isSmoker ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800 opacity-40"}`}
                    >
                      <Activity
                        className={`w-5 h-5 ${selectedChart.isSmoker ? "text-red-500" : "text-white"}`}
                      />
                      <div>
                        <p className="text-[10px] text-white">
                          Smoking Status
                        </p>
                        <p className="text-xs font-bold text-white">
                          {selectedChart.isSmoker ? "Smoker" : "Non-Smoker"}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-xl border flex items-center gap-3 ${selectedChart.isAlcoholic ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800 opacity-40"}`}
                    >
                      <Activity
                        className={`w-5 h-5 ${selectedChart.isAlcoholic ? "text-red-500" : "text-white"}`}
                      />
                      <div>
                        <p className="text-[10px] text-white">
                          Alcohol Consumption
                        </p>
                        <p className="text-xs font-bold text-white">
                          {selectedChart.isAlcoholic ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Food Guidelines */}
                  <div className="mt-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                    <h5 className="text-emerald-400 font-bold text-sm mb-3">
                      General Food Guidelines:
                    </h5>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <li className="text-[11px] text-zinc-300 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Hydration: Minimum 3.5L water/day.
                      </li>
                      <li className="text-[11px] text-zinc-300 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        No processed/packaged foods.
                      </li>
                      <li className="text-[11px] text-zinc-300 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Walk for 15 mins post-meal.
                      </li>
                      <li className="text-[11px] text-zinc-300 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Consult before supplement use.
                      </li>
                    </ul>
                  </div>

                  {/* Doctor Signature */}
                  <div className="pt-8 border-t border-zinc-900 flex flex-col items-end">
                    <p className="text-xs text-white italic">
                      This plan is medically reviewed and
                    </p>
                    <p className="font-bold text-white text-lg">{clinicName}</p>
                    <div className="h-0.5 w-32 bg-blue-500/30 mt-1" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-900 bg-zinc-950 flex flex-col gap-4">
              {localFlowingRX ? (
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm sm:text-base px-2"
                  onClick={handleFinalSubmit}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {isGenerating
                    ? "Finalizing Consultation..."
                    : "FINAL SUBMIT & SEND TO PATIENT"}
                </Button>
              ) : (
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl py-6 font-bold"
                    onClick={async () => {
                      if (!selectedChart) return;
                      // Just generate the PDF and force download instead of full submission
                      try {
                        const { jsPDF } = await import("jspdf");
                        const doc = new jsPDF();
                        doc.setFontSize(20);
                        doc.setTextColor(37, 99, 235);
                        doc.text("AI DIET CHART", 105, 20, { align: "center" });

                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text(
                          `Patient: ${selectedChart.patientName}`,
                          20,
                          35,
                        );
                        doc.text(
                          `Age/Gender: ${selectedChart.age} / ${selectedChart.gender}`,
                          20,
                          42,
                        );
                        doc.text(`Date: ${selectedChart.date}`, 20, 49);

                        doc.setDrawColor(200);
                        doc.line(20, 55, 190, 55);

                        let currentY = 65;
                        selectedChart.plan?.forEach((day) => {
                          if (currentY > 250) {
                            doc.addPage();
                            currentY = 20;
                          }
                          doc.setFont("helvetica", "bold");
                          doc.text(`DAY ${day.day}`, 20, currentY);
                          currentY += 10;

                          day.meals.forEach((meal) => {
                            doc.setFont("helvetica", "bold");
                            doc.text(meal.type, 25, currentY);
                            currentY += 6;
                            doc.setFont("helvetica", "normal");
                            meal.items.forEach((item) => {
                              doc.text(
                                `${item.name} (${item.weight}) - ${item.kcal}`,
                                30,
                                currentY,
                              );
                              currentY += 5;
                            });
                            currentY += 5;
                          });
                        });
                        doc.save(`Diet_Chart_${selectedChart.patientName}.pdf`);
                        toast.success("Diet Chart PDF downloaded successfully");
                      } catch (error) {
                        toast.error("Failed to generate PDF");
                      }
                    }}
                  >
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-[2] border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl py-6 font-bold"
                    onClick={() => {
                      const text = `Diet Chart for ${selectedChart?.patientName}\n\nGenerated on: ${selectedChart?.date}\n\nYour personalized AI diet plan has been generated by ${doctorInfo?.clinicName || "HealQR Clinic"}.`;
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(text)}`,
                      );
                    }}
                  >
                    Share via WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
