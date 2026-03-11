import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  QrCode,
  Package,
  Download,
  MapPin,
  User,
  Calendar,
  Clock,
  FileText,
  ArrowLeft,
  Search,
  CheckCircle,
  Truck,
  AlertCircle,
  Eye,
  RefreshCw,
  Printer,
  Target,
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { db } from "../lib/firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
// @ts-ignore
import QRCode from "qrcode";

interface QRBatch {
  id: string;
  batchNumber: string;
  startQR: number;
  endQR: number;
  totalQRs: number;
  region: string;
  mrName: string;
  dispatchDate: string;
  implementationDeadline: string;
  remarks: string;
  status: "generated" | "dispatched" | "deployed";
  createdAt: any;
  createdBy: string;
}

interface AdminQRGenerationProps {
  onBack: () => void;
}

export default function AdminQRGeneration({ onBack }: AdminQRGenerationProps) {
  const [activeTab, setActiveTab] = useState<
    "create" | "inventory" | "display"
  >("create");

  // QR Display Panel states
  const [displayQRNumber, setDisplayQRNumber] = useState("");
  const [displayQRData, setDisplayQRData] = useState<any>(null);
  const [displayQRImage, setDisplayQRImage] = useState<string | null>(null);
  const [searchingQR, setSearchingQR] = useState(false);
  const [linkedDoctorData, setLinkedDoctorData] = useState<any>(null);
  const [linkedClinicData, setLinkedClinicData] = useState<any>(null);

  // Print Movement Panel states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<QRBatch | null>(null);
  const [printSize, setPrintSize] = useState<
    "a4" | "letter" | "small" | "large"
  >("a4");
  const [printProgress, setPrintProgress] = useState<
    "idle" | "downloading" | "ready"
  >("idle");
  const [batchPreviewImage, setBatchPreviewImage] = useState<string | null>(null);

  // QR Template Calibration sliders (percentages of image dimensions)
  const [qrXPct, setQrXPct] = useState(36);   // X position % - final tweak right
  const [qrYPct, setQrYPct] = useState(50.5); // Y position % - final tweak down
  const [qrSizePct, setQrSizePct] = useState(20); // Size % - perfect

  // Form states
  const [startNumber, setStartNumber] = useState(1);
  const [endNumber, setEndNumber] = useState(100);
  const [region, setRegion] = useState("");
  const [mrName, setMrName] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [remarks, setRemarks] = useState("");
  const [generating, setGenerating] = useState(false);
  const [nextAvailable, setNextAvailable] = useState<number | null>(null);
  const [checkingNext, setCheckingNext] = useState(false);

  // Inventory states
  const [batches, setBatches] = useState<QRBatch[]>([]);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "generated" | "dispatched" | "deployed"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    generated: 0,
    dispatched: 0,
    deployed: 0,
  });

  useEffect(() => {
    loadBatches();
    getNextAvailableNumber();
  }, []);

  useEffect(() => {
    if (showPrintModal && selectedBatch) {
      const generateBatchPreview = async () => {
        try {
          const qrNumber = `HQR${String(selectedBatch.startQR).padStart(5, "0")}`;
          const qrUrl = await QRCode.toDataURL(qrNumber);
          setBatchPreviewImage(qrUrl);
        } catch (error) {
          console.error("Error generating batch preview QR:", error);
        }
      };
      generateBatchPreview();
    } else {
      setBatchPreviewImage(null);
    }
  }, [showPrintModal, selectedBatch]);

  const getNextAvailableNumber = async () => {
    if (!db) return;
    setCheckingNext(true);

    try {
      const qrPoolCollection = collection(db, "qrPool");
      const qrCodesCollection = collection(db, "qrCodes"); // Old collection

      const [poolQrs, codesQrs] = await Promise.all([
        getDocs(qrPoolCollection),
        getDocs(qrCodesCollection),
      ]);

      // Find highest HQR number across BOTH collections (qrPool + old qrCodes)
      let maxNumber = 0;
      // Check qrPool collection
      poolQrs.forEach((doc) => {
        const qrNum = doc.data().qrNumber;
        if (qrNum && qrNum.startsWith("HQR")) {
          const num = parseInt(qrNum.replace("HQR", ""));
          if (!isNaN(num) && num > maxNumber) maxNumber = num;
        }
      });
      // Check old qrCodes collection
      codesQrs.forEach((doc) => {
        const qrNum = doc.data().qrNumber;
        if (qrNum && qrNum.startsWith("HQR")) {
          const num = parseInt(qrNum.replace("HQR", ""));
          if (!isNaN(num) && num > maxNumber) maxNumber = num;
        }
      });

      console.log("📊 Admin QR Check - Max from both collections:", maxNumber);

      const nextNum = maxNumber + 1;
      setNextAvailable(nextNum);
      setStartNumber(nextNum);
      setEndNumber(nextNum + 99); // Default batch of 100
    } catch (error) {
      console.error("Error finding next available:", error);
    } finally {
      setCheckingNext(false);
    }
  };

  const loadBatches = async () => {
    if (!db) return;

    try {
      const batchCollection = collection(db, "qrBatches");
      const batchQuery = query(batchCollection, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(batchQuery);

      const loadedBatches: QRBatch[] = [];
      let generated = 0,
        dispatched = 0,
        deployed = 0;

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as QRBatch;
        loadedBatches.push(data);

        if (data.status === "generated") generated++;
        if (data.status === "dispatched") dispatched++;
        if (data.status === "deployed") deployed++;
      });

      setBatches(loadedBatches);
      setStats({
        total: loadedBatches.length,
        generated,
        dispatched,
        deployed,
      });
    } catch (error) {
      console.error("Error loading batches:", error);
    }
  };

  const generateBatch = async () => {
    if (!db) {
      toast.error("Firebase not configured");
      return;
    }

    // Validation
    if (startNumber < 1 || endNumber > 99999 || startNumber > endNumber) {
      toast.error("Valid range: 00001-99999");
      return;
    }

    if (!region || !mrName || !dispatchDate || !deadline) {
      toast.error("Please fill all required fields");
      return;
    }

    setGenerating(true);

    try {
      const qrCollection = collection(db, "qrPool");
      const batchCollection = collection(db, "qrBatches");

      const batchNumber = `BATCH-${Date.now()}`;

      // Create QR codes in Firestore
      const qrsCreated = [];
      for (let i = startNumber; i <= endNumber; i++) {
        const qrNumber = `HQR${String(i).padStart(5, "0")}`;

        // Check if exists
        const existingQuery = query(
          qrCollection,
          where("qrNumber", "==", qrNumber),
        );
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
          console.log(`${qrNumber} already exists, skipping...`);
          continue;
        }

        // Create QR with batch info
        await addDoc(qrCollection, {
          qrNumber,
          status: "available",
          qrType: "preprinted",
          generatedBy: "admin",
          linkedEmail: null,
          linkedAt: null,
          createdAt: serverTimestamp(),
          monthlyScans: 0,
          monthlyBookings: 0,
          lastResetDate: new Date().toISOString().slice(0, 7),
          // Batch/Inventory info
          batchNumber,
          region,
          mrName,
          dispatchDate,
          implementationDeadline: deadline,
        });

        qrsCreated.push(qrNumber);
      }

      // Create batch record
      await addDoc(batchCollection, {
        batchNumber,
        startQR: startNumber,
        endQR: endNumber,
        totalQRs: qrsCreated.length,
        region,
        mrName,
        dispatchDate,
        implementationDeadline: deadline,
        remarks,
        status: "generated",
        createdAt: serverTimestamp(),
        createdBy: "admin@healqr.com",
      });

      toast.success(
        `✅ Batch ${batchNumber} created successfully! ${qrsCreated.length} QR codes generated and ready for printing.`,
        {
          duration: 5000,
        },
      );

      // Reset form
      setStartNumber(endNumber + 1);
      setEndNumber(endNumber + 100);
      setRegion("");
      setMrName("");
      setDispatchDate("");
      setDeadline("");
      setRemarks("");

      // Reload batches
      await loadBatches();

      // Switch to inventory tab to show new batch
      setActiveTab("inventory");

      // Show additional prompt to download
      setTimeout(() => {
        toast.info('📥 Go to "Batch Inventory" tab to download printable QRs', {
          duration: 5000,
        });
      }, 1000);
    } catch (error: any) {
      console.error("Error generating batch:", error);
      toast.error("Failed to generate batch", {
        description: error?.message || "Please check Firebase connection",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadBatchQRs = async (batch: QRBatch, size: string = "a4") => {
    try {
      setPrintProgress("downloading");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Size configurations
      const sizeConfigs = {
        a4: { width: 2480, height: 3508, qrSize: 200, cols: 4, rows: 6 },
        letter: { width: 2550, height: 3300, qrSize: 200, cols: 4, rows: 6 },
        small: { width: 2480, height: 3508, qrSize: 150, cols: 5, rows: 8 },
        large: { width: 2480, height: 3508, qrSize: 250, cols: 3, rows: 4 },
      };

      const config =
        sizeConfigs[size as keyof typeof sizeConfigs] || sizeConfigs.a4;
      const pageWidth = config.width;
      const pageHeight = config.height;
      const qrSize = config.qrSize;
      const cols = config.cols;
      const rows = config.rows;
      const marginX = (pageWidth - cols * qrSize * 1.5) / 2;
      const marginY = 250;
      const spacingX = qrSize * 1.5;
      const spacingY = qrSize * 2;

      const totalQRs = batch.endQR - batch.startQR + 1;
      const pages = Math.ceil(totalQRs / (cols * rows));

      for (let page = 0; page < pages; page++) {
        canvas.width = pageWidth;
        canvas.height = pageHeight;

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageWidth, pageHeight);

        // Header
        ctx.fillStyle = "#000000";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("HealQR - QR Batch", pageWidth / 2, 80);

        // Batch info
        ctx.font = "24px Arial";
        ctx.fillText(
          `${batch.batchNumber} | ${batch.region} | MR: ${batch.mrName}`,
          pageWidth / 2,
          130,
        );
        ctx.fillText(
          `Dispatch: ${batch.dispatchDate} | Deadline: ${batch.implementationDeadline}`,
          pageWidth / 2,
          170,
        );

        const startIdx = page * cols * rows;
        const endIdx = Math.min(startIdx + cols * rows, totalQRs);

        for (let i = startIdx; i < endIdx; i++) {
          const qrNum = batch.startQR + i;
          const qrNumber = `HQR${String(qrNum).padStart(5, "0")}`;
          const localIdx = i - startIdx;
          const col = localIdx % cols;
          const row = Math.floor(localIdx / cols);

          const x = marginX + col * spacingX;
          const y = marginY + row * spacingY;

          // Generate QR code
          const qrDataUrl = await QRCode.toDataURL(
            `${window.location.origin}?doctorId=SCAN&qrNumber=${qrNumber}`,
            { width: qrSize, margin: 1 },
          );

          const img = new Image();
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = qrDataUrl;
          });

          // Draw QR
          ctx.drawImage(img, x, y, qrSize, qrSize);

          // QR Number
          ctx.font = "bold 28px Arial";
          ctx.textAlign = "center";
          ctx.fillStyle = "#000000";
          ctx.fillText(qrNumber, x + qrSize / 2, y + qrSize + 35);

          // Batch info
          ctx.font = "16px Arial";
          ctx.fillStyle = "#666666";
          ctx.fillText(batch.region, x + qrSize / 2, y + qrSize + 60);
        }

        // Download
        const link = document.createElement("a");
        link.download = `${batch.batchNumber}-page${page + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }

      setPrintProgress("ready");
      toast.success(`✅ ${pages} page(s) downloaded! Ready to print.`);
    } catch (error) {
      console.error("Error downloading batch:", error);
      toast.error("Download failed");
      setPrintProgress("idle");
    }
  };

  const downloadSingleQRWithTemplate = async (qrNumber: string) => {
    try {
      setPrintProgress("downloading");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const templateImg = new Image();
      templateImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        templateImg.onload = resolve;
        templateImg.onerror = reject;
        templateImg.src = `/qr-template.png?v=${Date.now()}`;
      });

      canvas.width = templateImg.width;
      canvas.height = templateImg.height;

      const qrSize = canvas.width * (qrSizePct / 100);
      const qrX = canvas.width * (qrXPct / 100);
      const qrY = canvas.height * (qrYPct / 100);
      const boxCenterX = qrX + qrSize / 2;

      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

      const qrDataUrl = await QRCode.toDataURL(
        `${window.location.origin}?doctorId=SCAN&qrNumber=${qrNumber}`,
        {
          width: 800,
          margin: 1,
          color: { dark: "#000000", light: "#FFFFFF" },
        }
      );

      const qrImg = new Image();
      await new Promise((resolve) => {
        qrImg.onload = resolve;
        qrImg.src = qrDataUrl;
      });

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      ctx.save();
      const fontSize = Math.floor(canvas.width * 0.035);
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#000000";
      const textY = qrY + qrSize + canvas.height * 0.005;
      ctx.fillText(qrNumber, boxCenterX, textY);
      ctx.restore();

      const link = document.createElement("a");
      link.download = `${qrNumber}-template.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      setPrintProgress("ready");
      toast.success(`✅ QR ${qrNumber} template downloaded!`);
    } catch (error) {
      console.error("Error downloading single QR template:", error);
      toast.error("Download failed");
      setPrintProgress("idle");
    }
  };

  const downloadBatchQRsOnTemplate = async (batch: QRBatch, xPct = qrXPct, yPct = qrYPct, sizePct = qrSizePct) => {
    try {
      setPrintProgress("downloading");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Load the template image with cache-busting to always get the latest version
      const templateImg = new Image();
      templateImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        templateImg.onload = resolve;
        templateImg.onerror = reject;
        // Add timestamp to bypass Firebase CDN cache
        templateImg.src = `/qr-template.png?v=${Date.now()}`;
      });

      // Set canvas to template dimensions
      canvas.width = templateImg.width;
      canvas.height = templateImg.height;

      const totalQRs = batch.endQR - batch.startQR + 1;

      // Calibration values passed in from the UI sliders
      const qrSize = canvas.width * (sizePct / 100);
      const qrX = canvas.width * (xPct / 100);
      const qrY = canvas.height * (yPct / 100);

      const boxCenterX = qrX + qrSize / 2;   // Center X for text alignment

      for (let i = 0; i < totalQRs; i++) {
        // Draw the template background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

        const qrNum = batch.startQR + i;
        const qrNumber = `HQR${String(qrNum).padStart(5, "0")}`;

        // Generate the QR Code at high resolution for crisp print quality
        const qrDataUrl = await QRCode.toDataURL(
          `${window.location.origin}?doctorId=SCAN&qrNumber=${qrNumber}`,
          {
            width: 800,
            margin: 1, // smaller margin looks better inside the tight template box
            color: { dark: "#000000", light: "#FFFFFF" },
          },
        );

        const qrImg = new Image();
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.src = qrDataUrl;
        });

        // Draw the QR Code onto the template
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Draw the HQR Number directly below the QR code
        ctx.save(); // Save state to be safe
        const fontSize = Math.floor(canvas.width * 0.035); // slightly smaller font
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#000000";
        
        const textY = qrY + qrSize + (canvas.height * 0.005);
        ctx.fillText(qrNumber, boxCenterX, textY);
        ctx.restore(); // Restore state

        // Download
        const link = document.createElement("a");
        link.download = `${batch.batchNumber}-${qrNumber}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        // Small delay to prevent browser from blocking multiple rapid downloads
        await new Promise((r) => setTimeout(r, 100));
      }

      setPrintProgress("ready");
      toast.success(`✅ ${totalQRs} template(s) downloaded! Ready to print.`);
    } catch (error) {
      console.error("Error downloading template batch:", error);
      toast.error(
        "Template download failed. Ensure /qr-template.png exists in public folder.",
      );
      setPrintProgress("idle");
    }
  };

  const updateBatchStatus = async (
    batchId: string,
    newStatus: "generated" | "dispatched" | "deployed",
  ) => {
    if (!db) return;

    try {
      const batchRef = doc(db, "qrBatches", batchId);
      await updateDoc(batchRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      toast.success("Status updated");
      await loadBatches();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredBatches = batches.filter((batch) => {
    const matchesStatus =
      filterStatus === "all" || batch.status === filterStatus;
    const matchesSearch =
      !searchTerm ||
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.mrName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "generated":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "dispatched":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "deployed":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "generated":
        return <Package className="w-4 h-4" />;
      case "dispatched":
        return <Truck className="w-4 h-4" />;
      case "deployed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">
                QR Generation & Inventory
              </h1>
              <p className="text-gray-400 text-xs sm:text-base">
                Production to deployment tracking
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Batches</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-12 h-12 text-gray-500" />
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Generated</p>
                <p className="text-3xl font-bold text-blue-400">
                  {stats.generated}
                </p>
              </div>
              <Package className="w-12 h-12 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Dispatched</p>
                <p className="text-3xl font-bold text-amber-400">
                  {stats.dispatched}
                </p>
              </div>
              <Truck className="w-12 h-12 text-amber-400" />
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Deployed</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {stats.deployed}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-zinc-800 -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-3 sm:px-6 py-2.5 sm:py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === "create"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            <QrCode className="w-4 h-4 inline-block mr-1 sm:mr-2" />
            Create Batch
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3 sm:px-6 py-2.5 sm:py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === "inventory"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            <Package className="w-4 h-4 inline-block mr-1 sm:mr-2" />
            Batch Inventory
          </button>
          <button
            onClick={() => setActiveTab("display")}
            className={`px-3 sm:px-6 py-2.5 sm:py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === "display"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            <Eye className="w-4 h-4 inline-block mr-1 sm:mr-2" />
            QR Display Panel
          </button>
        </div>

        {/* Create Tab */}
        {activeTab === "create" && (
          <Card className="bg-zinc-900 border-zinc-800 p-8">
            <h2 className="text-2xl font-bold mb-6">Create New QR Batch</h2>

            {/* Next Available Suggestion */}
            {nextAvailable !== null && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-emerald-400 font-semibold">
                        Next Available from Universal Pool
                      </p>
                      <p className="text-xs text-gray-400">
                        Includes both pre-printed and virtual QR numbers
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400 font-mono">
                      HQR{String(nextAvailable).padStart(5, "0")}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={getNextAvailableNumber}
                      disabled={checkingNext}
                      className="text-xs text-gray-400 hover:text-emerald-400"
                    >
                      <RefreshCw
                        className={`w-3 h-3 mr-1 ${checkingNext ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* QR Range */}
              <div>
                <Label className="mb-2 flex items-center gap-2 text-gray-200">
                  <QrCode className="w-4 h-4" />
                  Start Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={startNumber}
                  onChange={(e) => setStartNumber(Number(e.target.value))}
                  min={1}
                  max={99999}
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <Label className="mb-2 flex items-center gap-2 text-gray-200">
                  <QrCode className="w-4 h-4" />
                  End Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={endNumber}
                  onChange={(e) => setEndNumber(Number(e.target.value))}
                  min={1}
                  max={99999}
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Region */}
              <div>
                <Label className="mb-2 flex items-center gap-2 text-gray-200">
                  <MapPin className="w-4 h-4" />
                  Region/Territory <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g., West Bengal, Delhi NCR"
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-gray-500"
                />
              </div>

              {/* MR Name */}
              <div>
                <Label className="mb-2 flex items-center gap-2 text-gray-200">
                  <User className="w-4 h-4" />
                  MR Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={mrName}
                  onChange={(e) => setMrName(e.target.value)}
                  placeholder="e.g., Rajesh Kumar"
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Dispatch Date */}
              <div>
                <Label className="mb-2 flex items-center gap-2 text-gray-200">
                  <Calendar className="w-4 h-4" />
                  Dispatch Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white [color-scheme:dark]"
                />
              </div>

              {/* Implementation Deadline */}
              <div>
                <Label className="mb-2 flex items-center gap-2 text-gray-200">
                  <Clock className="w-4 h-4" />
                  Implementation Deadline{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="mb-6">
              <Label className="mb-2 flex items-center gap-2 text-gray-200">
                <FileText className="w-4 h-4" />
                Remarks / Notes
              </Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional notes about this batch..."
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-gray-500 min-h-[100px]"
              />
            </div>

            {/* Summary */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-400">
                <strong>Batch Summary:</strong> {endNumber - startNumber + 1} QR
                codes will be created (
                {`HQR${String(startNumber).padStart(5, "0")}`} to{" "}
                {`HQR${String(endNumber).padStart(5, "0")}`})
              </p>
            </div>

            <Button
              onClick={generateBatch}
              disabled={generating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white w-full h-12"
            >
              {generating ? "Generating..." : "Generate Batch"}
            </Button>
          </Card>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <Card className="bg-zinc-900 border-zinc-800 p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">Batch Inventory</h2>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search batches..."
                    className="pl-10 bg-zinc-950 border-zinc-800 text-white w-full sm:w-64"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-2 w-full sm:w-auto"
                >
                  <option value="all">All Status</option>
                  <option value="generated">Generated</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="deployed">Deployed</option>
                </select>
              </div>
            </div>

            {/* Batches List */}
            <div className="space-y-4">
              {filteredBatches.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No batches found</p>
                </div>
              ) : (
                filteredBatches.map((batch) => (
                  <Card
                    key={batch.id}
                    className="bg-zinc-800 border-zinc-700 p-4 sm:p-6"
                  >
                    <div className="space-y-3">
                      {/* Top row: batch name + badge + actions */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h3 className="text-base sm:text-lg font-bold break-all">
                          {batch.batchNumber}
                        </h3>
                        <Badge className={getStatusColor(batch.status)}>
                          {getStatusIcon(batch.status)}
                          <span className="ml-1 capitalize">
                            {batch.status}
                          </span>
                        </Badge>
                        <div className="flex gap-2 ml-auto">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedBatch(batch);
                              setShowPrintModal(true);
                              setPrintProgress("idle");
                            }}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Print
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => downloadBatchQRsOnTemplate(batch)}
                            disabled={printProgress === "downloading"}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            <QrCode className="w-4 h-4 mr-1" />
                            Print Template
                          </Button>
                          <select
                            value={batch.status}
                            onChange={(e) =>
                              updateBatchStatus(batch.id, e.target.value as any)
                            }
                            className="bg-zinc-950 border border-zinc-700 text-white rounded px-2 sm:px-3 py-1 text-sm"
                          >
                            <option value="generated">Generated</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="deployed">Deployed</option>
                          </select>
                        </div>
                      </div>

                      {/* Batch details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <QrCode className="w-4 h-4 shrink-0" />
                          <span>
                            {batch.totalQRs} QRs (#{batch.startQR}-#
                            {batch.endQR})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>{batch.region}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="w-4 h-4 shrink-0" />
                          <span>{batch.mrName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>Dispatch: {batch.dispatchDate}</span>
                        </div>
                      </div>

                      {batch.remarks && (
                        <p className="text-gray-500 text-sm">
                          <FileText className="w-3 h-3 inline mr-1" />
                          {batch.remarks}
                        </p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        )}

        {/* QR Display Panel Tab */}
        {activeTab === "display" && (
          <Card className="bg-zinc-900 border-zinc-800 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h2 className="text-2xl font-bold text-white">QR Display Panel</h2>
                  <p className="text-gray-400 text-sm mt-1">Search, calibrate, and download single QR templates</p>
               </div>
               <div className="flex gap-2 min-w-[300px]">
                  <div className="relative flex-1">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    <Input
                      type="text"
                      value={displayQRNumber}
                      onChange={(e) => setDisplayQRNumber(e.target.value.toUpperCase())}
                      placeholder="Enter QR Number (e.g. HQR00374)"
                      className="pl-10 bg-zinc-950 border-zinc-800 text-white h-11"
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") await searchAndDisplayQR();
                      }}
                    />
                  </div>
                  <Button
                    onClick={searchAndDisplayQR}
                    disabled={searchingQR || !displayQRNumber}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white h-11"
                  >
                    {searchingQR ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Display QR"}
                  </Button>
               </div>
            </div>
            
            {displayQRData && displayQRImage ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* Left Column: Massive Live Preview (Main Act) */}
                <div className="xl:col-span-7 space-y-6">
                  <div className="relative group">
                    <Card className="bg-zinc-800 border-zinc-700 p-4 sm:p-8 overflow-hidden shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Eye className="w-5 h-5 text-blue-400" />
                          Live Template Preview
                        </h3>
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">SS2 Standard Match</Badge>
                      </div>

                      {/* The Big Live Container */}
                      <div className="relative w-full max-w-[500px] mx-auto aspect-[1/1.41] bg-white rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-zinc-700">
                        {/* Template Image Background */}
                        <img 
                          src={`/qr-template.png?t=${new Date().getTime()}`} 
                          alt="Template Background"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => { 
                            e.currentTarget.style.display = 'none'; 
                            e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full w-full text-xs text-red-500 font-bold bg-zinc-100 p-4 text-center">Template Missing in /public/qr-template.png</div>';
                          }} 
                        />
                        
                        {/* Dynamic QR Overlay (SS2 Matching Physics) */}
                        <div 
                          className="absolute flex flex-col items-center"
                          style={{
                            left: `${qrXPct}%`,
                            top: `${qrYPct}%`,
                            width: `${qrSizePct}%`,
                            transition: 'all 0.1s ease-out'
                          }}
                        >
                          <img 
                            src={displayQRImage} 
                            alt="Dynamic QR" 
                            className="w-full h-auto drop-shadow-md bg-white p-0.5"
                          />
                          <div className="w-full text-center mt-[1%]">
                             <p className="font-bold text-black" style={{ fontSize: 'min(1vw, 10px)' }}>{displayQRData.qrNumber}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 grid grid-cols-2 gap-4">
                        <Button
                          onClick={() => downloadSingleQRWithTemplate(displayQRData.qrNumber)}
                          disabled={printProgress === "downloading"}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-lg font-bold shadow-lg shadow-emerald-500/20"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Download Template (PNG)
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.download = `${displayQRData.qrNumber}.png`;
                            link.href = displayQRImage;
                            link.click();
                          }}
                          className="border-zinc-700 text-gray-300 hover:bg-zinc-800 h-12"
                        >
                          <QrCode className="w-5 h-5 mr-2" />
                          Download Raw QR
                        </Button>
                      </div>
                    </Card>

                    {/* Quick Tips */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-blue-400" />
                         </div>
                         <p className="text-[10px] text-gray-400 leading-tight">Live sync with calibration sliders</p>
                      </div>
                      <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                         </div>
                         <p className="text-[10px] text-gray-400 leading-tight">Pixel-perfect alignment for printing</p>
                      </div>
                      <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <Printer className="w-4 h-4 text-purple-400" />
                         </div>
                         <p className="text-[10px] text-gray-400 leading-tight">Ready for 1:1 scale deployment</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Controls & Context */}
                <div className="xl:col-span-5 space-y-6">
                  
                  {/* Calibration Panel */}
                  <Card className="bg-zinc-800 border-zinc-700 p-6 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                       <RefreshCw className="w-24 h-24" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                       <Target className="w-5 h-5 text-emerald-400" />
                       Precision Calibration
                    </h3>
                    
                    <div className="space-y-6">
                      {/* X Position */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm text-gray-300 font-medium">← Left / Right →</label>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/20">{qrXPct.toFixed(1)}%</span>
                        </div>
                        <input
                          type="range" min="0" max="80" step="0.5"
                          value={qrXPct}
                          onChange={(e) => setQrXPct(Number(e.target.value))}
                          className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                      
                      {/* Y Position */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm text-gray-300 font-medium">↑ Up / Down ↓</label>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/20">{qrYPct.toFixed(1)}%</span>
                        </div>
                        <input
                          type="range" min="0" max="95" step="0.5"
                          value={qrYPct}
                          onChange={(e) => setQrYPct(Number(e.target.value))}
                          className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                      
                      {/* Size */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm text-gray-300 font-medium">🔎 QR Size</label>
                          <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-500/20">{qrSizePct.toFixed(1)}%</span>
                        </div>
                        <input
                          type="range" min="5" max="60" step="0.5"
                          value={qrSizePct}
                          onChange={(e) => setQrSizePct(Number(e.target.value))}
                          className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setQrXPct(36); setQrYPct(50.5); setQrSizePct(20); }}
                          className="w-full text-xs text-gray-500 hover:text-white hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-600"
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Reset to SS1 Standard Defaults
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* QR Meta Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Card className="bg-zinc-900 border-zinc-800 p-4">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Status</p>
                        <Badge
                          className={
                            displayQRData.linkedEmail
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }
                        >
                          {displayQRData.linkedEmail ? "ACTIVE - IN USE" : "AVAILABLE"}
                        </Badge>
                     </Card>
                     <Card className="bg-zinc-900 border-zinc-800 p-4">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Region</p>
                        <p className="text-sm font-bold text-white">{displayQRData.region || 'GLOBAL'}</p>
                     </Card>
                     <Card className="bg-zinc-900 border-zinc-800 p-4">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">MR Assigned</p>
                        <p className="text-sm font-bold text-white truncate">{displayQRData.mrName || 'NOT ASSIGNED'}</p>
                     </Card>
                     <Card className="bg-zinc-900 border-zinc-800 p-4">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Batch #</p>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">{displayQRData.batchNumber || 'VIRTUAL_POOL'}</p>
                     </Card>
                  </div>

                  {/* Assignment Details Card */}
                  <Card className="bg-zinc-950 border-zinc-800 p-6 flex items-start gap-4">
                     <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-purple-400" />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                           <h3 className="font-bold text-white">Assignment Info</h3>
                           <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px]">Verified</Badge>
                        </div>
                        
                        {(linkedDoctorData || linkedClinicData) ? (
                           <div className="space-y-2">
                              <p className="text-sm text-gray-300 font-bold">
                                 {linkedDoctorData ? `Dr. ${linkedDoctorData.name || linkedDoctorData.displayName}` : linkedClinicData.clinicName || linkedClinicData.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                 <Mail className="w-3 h-3" />
                                 <span className="truncate">{displayQRData.linkedEmail}</span>
                              </div>
                              {linkedDoctorData?.specialization && (
                                 <p className="text-xs text-purple-400/80">{linkedDoctorData.specialization}</p>
                              )}
                           </div>
                        ) : (
                           <div className="py-2">
                              <p className="text-xs text-zinc-600 italic">This QR is currently available for recruitment and hasn't been linked to any doctor or clinic yet.</p>
                           </div>
                        )}
                     </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-24 bg-zinc-950/30 rounded-3xl border-2 border-dashed border-zinc-800/50">
                <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mx-auto mb-6">
                       <QrCode className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-300 mb-2">Individual QR Calibration</h3>
                    <p className="text-gray-500 text-sm mb-8">Enter a QR number above to bridge the physical gap between code and template.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                       <Badge variant="outline" className="text-zinc-600 border-zinc-800">HQR00374</Badge>
                       <Badge variant="outline" className="text-zinc-600 border-zinc-800">HQR00500</Badge>
                       <Badge variant="outline" className="text-zinc-600 border-zinc-800">HQR01234</Badge>
                    </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Print Movement Panel Modal */}
        {showPrintModal && selectedBatch && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <Card className="bg-zinc-900 border-zinc-700 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Print Movement Panel
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setShowPrintModal(false)}
                  className="border-zinc-700 text-gray-300"
                >
                  ✕
                </Button>
              </div>

              {/* Workflow Steps */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold mb-2">
                    ✓
                  </div>
                  <p className="text-sm text-emerald-400 font-medium">
                    Created
                  </p>
                </div>

                <div className="flex-1 h-1 bg-emerald-500 mx-4"></div>

                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold mb-2">
                    ✓
                  </div>
                  <p className="text-sm text-emerald-400 font-medium">
                    Generated
                  </p>
                </div>

                <div
                  className={`flex-1 h-1 mx-4 ${printProgress === "idle" ? "bg-zinc-700" : "bg-emerald-500"}`}
                ></div>

                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-2 ${
                      printProgress === "idle"
                        ? "bg-zinc-700"
                        : printProgress === "downloading"
                          ? "bg-blue-500 animate-pulse"
                          : "bg-emerald-500"
                    }`}
                  >
                    {printProgress === "downloading"
                      ? "..."
                      : printProgress === "ready"
                        ? "✓"
                        : "3"}
                  </div>
                  <p
                    className={`text-sm font-medium ${printProgress === "idle" ? "text-gray-400" : "text-blue-400"}`}
                  >
                    Download
                  </p>
                </div>

                <div
                  className={`flex-1 h-1 mx-4 ${printProgress === "ready" ? "bg-emerald-500" : "bg-zinc-700"}`}
                ></div>

                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-2 ${
                      printProgress === "ready"
                        ? "bg-emerald-500"
                        : "bg-zinc-700"
                    }`}
                  >
                    {printProgress === "ready" ? "✓" : "4"}
                  </div>
                  <p
                    className={`text-sm font-medium ${printProgress === "ready" ? "text-emerald-400" : "text-gray-400"}`}
                  >
                    Print
                  </p>
                </div>
              </div>

              {/* Batch Info */}
              <Card className="bg-zinc-800 border-zinc-700 p-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-3">
                  Batch Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Batch Number</p>
                    <p className="text-white font-medium">
                      {selectedBatch.batchNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total QRs</p>
                    <p className="text-white font-medium">
                      {selectedBatch.totalQRs} codes
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Region</p>
                    <p className="text-white font-medium">
                      {selectedBatch.region}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">MR Name</p>
                    <p className="text-white font-medium">
                      {selectedBatch.mrName}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Template Preview (Unified Live Preview) */}
              <Card className="bg-zinc-800 border-zinc-700 p-6 mb-6 overflow-hidden">
                <h3 className="text-lg font-bold text-white mb-4">Live Batch Preview</h3>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* The Live Container */}
                  <div className="relative w-full md:w-1/2 aspect-[1/1.41] bg-white rounded-lg overflow-hidden shadow-xl border border-zinc-700 mx-auto md:mx-0">
                    <img 
                      src={`/qr-template.png?t=${new Date().getTime()}`} 
                      alt="Template Background"
                      className="absolute inset-0 w-full h-full object-cover opacity-90"
                      onError={(e) => { 
                        e.currentTarget.style.display = 'none'; 
                        e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full w-full text-xs text-red-500 font-bold bg-zinc-100 p-4 text-center">Template Missing in /public/qr-template.png</div>';
                      }} 
                    />
                    
                    {/* Dynamic QR Overlay (Using the batch range context) */}
                    <div 
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${qrXPct}%`,
                        top: `${qrYPct}%`,
                        width: `${qrSizePct}%`,
                        transition: 'all 0.1s ease-out'
                      }}
                    >
                      {batchPreviewImage ? (
                        <img 
                          src={batchPreviewImage} 
                          alt="Batch Preview QR" 
                          className="w-full h-auto drop-shadow-md bg-white p-0.5"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-100 border border-zinc-300 flex items-center justify-center aspect-square">
                          <QrCode className="w-2/3 h-2/3 text-zinc-400" />
                        </div>
                      )}
                      <div className="w-full text-center mt-[1%]">
                         <p className="font-bold text-black" style={{ fontSize: 'min(1vw, 8px)' }}>{`HQR${String(selectedBatch.startQR).padStart(5, '0')}`}</p>
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-blue-500/80 text-white text-[10px] border-none px-1.5 py-0">Batch Mockup</Badge>
                    </div>
                  </div>

                  <div className="flex-1 text-sm text-gray-400 space-y-4 flex flex-col justify-center">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <p className="text-emerald-400 font-medium mb-1 flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        Placement Verification
                      </p>
                      <p className="text-xs leading-relaxed">
                        Adjust the sliders below to move the QR code. The preview shows exactly where the first code (**{`HQR${String(selectedBatch.startQR).padStart(5, '0')}`}**) will be placed on your **qr-template.png**.
                      </p>
                    </div>
                    
                    {selectedBatch.status !== 'generated' && (
                      <p className="bg-yellow-500/10 text-yellow-500/90 p-3 rounded-lg border border-yellow-500/20 text-xs uppercase font-bold tracking-wider text-center">
                        Batch already {selectedBatch.status}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* QR Position Calibration */}
              <Card className="bg-zinc-800 border-zinc-700 p-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-1">🎯 QR Position Calibration</h3>
                <p className="text-xs text-gray-400 mb-4">Adjust these sliders until the QR fits perfectly in the scan box, then click Print on Template.</p>
                <div className="space-y-4">
                  {/* X Position */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-300 font-medium">← Left / Right →</label>
                      <span className="text-sm text-emerald-400 font-mono">{qrXPct.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range" min="0" max="80" step="0.5"
                      value={qrXPct}
                      onChange={(e) => setQrXPct(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  {/* Y Position */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-300 font-medium">↑ Up / Down ↓</label>
                      <span className="text-sm text-emerald-400 font-mono">{qrYPct.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range" min="0" max="90" step="0.5"
                      value={qrYPct}
                      onChange={(e) => setQrYPct(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  {/* Size */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-300 font-medium">🔎 QR Size</label>
                      <span className="text-sm text-emerald-400 font-mono">{qrSizePct.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range" min="5" max="60" step="0.5"
                      value={qrSizePct}
                      onChange={(e) => setQrSizePct(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  {/* Reset button */}
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setQrXPct(36); setQrYPct(50.5); setQrSizePct(20); }}
                      className="w-full text-[10px] text-gray-500 hover:text-gray-300 hover:bg-zinc-700/50"
                    >
                      Reset to SS1 Standard Defaults
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Print Size Selection */}
              <div className="mb-6">
                <Label className="mb-3 text-gray-200 text-lg">
                  Select Print Size
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setPrintSize("a4")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      printSize === "a4"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-bold text-white mb-1">A4</p>
                      <p className="text-xs text-gray-400">210 × 297 mm</p>
                      <p className="text-xs text-gray-400">4 × 6 grid</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPrintSize("letter")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      printSize === "letter"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-bold text-white mb-1">Letter</p>
                      <p className="text-xs text-gray-400">8.5 × 11 in</p>
                      <p className="text-xs text-gray-400">4 × 6 grid</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPrintSize("small")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      printSize === "small"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-bold text-white mb-1">Small</p>
                      <p className="text-xs text-gray-400">Compact</p>
                      <p className="text-xs text-gray-400">5 × 8 grid</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPrintSize("large")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      printSize === "large"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-bold text-white mb-1">Large</p>
                      <p className="text-xs text-gray-400">Big QRs</p>
                      <p className="text-xs text-gray-400">3 × 4 grid</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {printProgress === "idle" && (
                  <>
                    <Button
                      onClick={() => downloadBatchQRs(selectedBatch, printSize)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-12"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download for Print
                    </Button>
                    <Button
                      onClick={() => downloadBatchQRsOnTemplate(selectedBatch)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-12"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Print on Template
                    </Button>
                  </>
                )}

                {printProgress === "downloading" && (
                  <Button
                    disabled
                    className="flex-1 bg-blue-500 text-white h-12"
                  >
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </Button>
                )}

                {printProgress === "ready" && (
                  <>
                    <Button
                      onClick={() => window.print()}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-12"
                    >
                      🖨️ Print Now
                    </Button>
                    <Button
                      onClick={() => {
                        setPrintProgress("idle");
                        setShowPrintModal(false);
                        toast.success("Printing workflow completed!");
                      }}
                      variant="outline"
                      className="border-zinc-700 text-gray-300"
                    >
                      Done
                    </Button>
                  </>
                )}
              </div>

              {printProgress === "ready" && (
                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-emerald-400 text-sm">
                    ✅ Files downloaded successfully! Click "Print Now" to send
                    to your printer, or use your browser's print function
                    (Ctrl+P / Cmd+P).
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  async function searchAndDisplayQR() {
    if (!db || !displayQRNumber.trim()) return;

    setSearchingQR(true);
    setDisplayQRData(null);
    setDisplayQRImage(null);
    setLinkedDoctorData(null);
    setLinkedClinicData(null);

    try {
      const qrCollection = collection(db, "qrPool");
      const q = query(
        qrCollection,
        where("qrNumber", "==", displayQRNumber.trim().toUpperCase()),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error(`QR ${displayQRNumber} not found in system`);
        return;
      }

      const qrDoc = snapshot.docs[0];
      const qrData = { id: qrDoc.id, ...qrDoc.data() } as any;
      setDisplayQRData(qrData);

      // Generate QR code image
      const qrUrl = `https://healqr.com/verify/${qrData.qrNumber}`;
      const qrImage = await QRCode.toDataURL(qrUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setDisplayQRImage(qrImage);

      // Fetch linked doctor/clinic data if a linkedEmail exists
      if (qrData.linkedEmail) {
        try {
          // Try to find a doctor with this email
          const doctorsQuery = query(
            collection(db, "doctors"),
            where("email", "==", qrData.linkedEmail),
          );
          const doctorSnapshot = await getDocs(doctorsQuery);
          if (!doctorSnapshot.empty) {
            const docData = doctorSnapshot.docs[0].data();
            setLinkedDoctorData({ id: doctorSnapshot.docs[0].id, ...docData });
          } else {
            // Try to find a clinic with this email
            const clinicsQuery = query(
              collection(db, "clinics"),
              where("email", "==", qrData.linkedEmail),
            );
            const clinicSnapshot = await getDocs(clinicsQuery);
            if (!clinicSnapshot.empty) {
              const clinicData = clinicSnapshot.docs[0].data();
              setLinkedClinicData({
                id: clinicSnapshot.docs[0].id,
                ...clinicData,
              });
            }
          }
        } catch (lookupError) {
          console.warn(
            "Could not fetch linked doctor/clinic data:",
            lookupError,
          );
        }
      }

      toast.success(`QR ${displayQRNumber} loaded successfully`);
    } catch (error) {
      console.error("Error searching QR:", error);
      toast.error("Failed to load QR code");
    } finally {
      setSearchingQR(false);
    }
  }
}
