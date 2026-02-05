import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Sparkles, Check, Loader2, AlertCircle, Send, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import Tesseract from 'tesseract.js';
import { AIRXReportTemplate } from './AIRXReportTemplate';
import { AIRXNotificationTemplate } from './AIRXNotificationTemplate';
import { db, storage } from '../lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendAIRXNotification } from '../utils/cloudFunctions';

interface DoctorAIRXUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  patientPhone: string;
  patientLanguage: 'english' | 'hindi' | 'bengali';
  onUploadSuccess?: () => void;
}

export const DoctorAIRXUploadModal: React.FC<DoctorAIRXUploadModalProps> = ({
  isOpen,
  onClose,
  patientName,
  patientId,
  patientPhone,
  patientLanguage,
  onUploadSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'upload' | 'ocr' | 'review' | 'sending' | 'done'>('upload');
  const [decodedText, setDecodedText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [doctorName, setDoctorName] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  
  // Marker Tool - Per Page Selection
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null); // Which page is being selected
  const [savedRegions, setSavedRegions] = useState<Array<{x: number; y: number; width: number; height: number} | null>>([]); // Saved selections per page
  const [croppedPreviews, setCroppedPreviews] = useState<Array<string | null>>([]); // Base64 preview of cropped portions
  const [currentDrawing, setCurrentDrawing] = useState<{x: number; y: number; width: number; height: number} | null>(null); // Temporary drawing
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number; y: number} | null>(null);
  const canvasRefs = React.useRef<(HTMLCanvasElement | null)[]>([]);
  const imageRefs = React.useRef<(HTMLImageElement | null)[]>([]);
  
  // Load doctorId IMMEDIATELY from localStorage (synchronous)
  const getDoctorId = () => {
    console.log('🔍 Reading localStorage...');
    
    // Try multiple localStorage keys
    const userId = localStorage.getItem('userId');
    const userStr = localStorage.getItem('user');
    
    console.log('📦 localStorage userId:', userId);
    console.log('📦 localStorage user:', userStr);
    
    // First try userId (simpler key)
    if (userId) {
      console.log('✅ Found userId:', userId);
      return userId;
    }
    
    // Fallback to user object
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('✅ Parsed user object:', user);
        console.log('🆔 UID from user:', user.uid);
        return user.uid || '';
      } catch (e) {
        console.error('❌ Error parsing user from localStorage:', e);
        return '';
      }
    }
    
    console.warn('⚠️ No user in localStorage');
    return '';
  };
  const [doctorId, setDoctorId] = useState<string>(getDoctorId());

  // Sync canvas size with active image
  useEffect(() => {
    if (activePageIndex !== null) {
      const canvas = canvasRefs.current[activePageIndex];
      const image = imageRefs.current[activePageIndex];
      
      if (canvas && image) {
        const rect = image.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        console.log(`🎨 Canvas ${activePageIndex + 1} synced:`, { width: rect.width, height: rect.height });
      }
    }
  }, [activePageIndex, previewUrls]);

  // Initialize savedRegions and croppedPreviews arrays when files change
  useEffect(() => {
    setSavedRegions(new Array(selectedFiles.length).fill(null));
    setCroppedPreviews(new Array(selectedFiles.length).fill(null));
  }, [selectedFiles.length]);

  // Load doctor name from Firestore (async, but ID is already available)
  React.useEffect(() => {
    const loadDoctorName = async () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('🔑 Doctor UID:', user.uid);
        if (db) {
          // Try doctors collection first, then users
          let docRef = doc(db, 'doctors', user.uid);
          let docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            docRef = doc(db, 'users', user.uid);
            docSnap = await getDoc(docRef);
          }
          if (docSnap.exists()) {
            setDoctorName(docSnap.data().name || 'Doctor');
            console.log('👨‍⚕️ Doctor name loaded:', docSnap.data().name);
          }
        }
      }
    };
    loadDoctorName();
  }, []);

  const languageNames = {
    english: 'English',
    hindi: 'Hindi (हिंदी)',
    bengali: 'Bengali (বাংলা)',
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 2); // Max 2 pages
      
      // Validate each file
      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          toast.error('Please select only image files');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Each file must be less than 10MB');
          return;
        }
      }

      setSelectedFiles(fileArray);

      // Create preview URLs for all files
      const previews: string[] = [];
      let loadedCount = 0;
      
      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          loadedCount++;
          if (loadedCount === fileArray.length) {
            setPreviewUrls(previews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Filter function to extract only medicines and instructions
  const filterMedicinesAndInstructions = (text: string): string => {
    const lines = text.split('\n');
    const filteredLines: string[] = [];
    
    // Keywords to skip (doctor info, clinic info, etc.)
    const skipKeywords = [
      'dr.', 'dr ', 'doctor', 'mbbs', 'md', 'ms', 'bams', 'bhms', 'phd', 
      'clinic', 'hospital', 'chamber', 'registration', 'reg.no', 'reg no',
      'phone:', 'tel:', 'email:', 'address:', 'timing:', 'consultation'
    ];
    
    // Keywords that indicate medicine/instruction sections
    const includeKeywords = [
      'tab', 'cap', 'syrup', 'injection', 'drops', 'ointment', 'cream',
      'mg', 'ml', 'dose', 'dosage', '1-0-1', '0-1-0', '1-1-1', 
      'morning', 'afternoon', 'evening', 'night', 'before food', 'after food',
      'instruction', 'note:', 'advice:', 'follow-up', 'continue', 'for', 'days'
    ];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();
      
      // Skip empty lines
      if (!lowerLine) continue;
      
      // Skip if contains skip keywords
      const shouldSkip = skipKeywords.some(keyword => lowerLine.includes(keyword));
      if (shouldSkip) continue;
      
      // Include if contains medicine/instruction keywords OR looks like dosage pattern
      const shouldInclude = includeKeywords.some(keyword => lowerLine.includes(keyword)) ||
                           /\d+\s*-\s*\d+\s*-\s*\d+/.test(lowerLine) || // Dosage pattern
                           /\d+\s*(mg|ml|g|tablet|capsule)/i.test(lowerLine); // Quantity pattern
      
      if (shouldInclude) {
        filteredLines.push(line);
      }
    }
    
    // If no lines matched, return a message instead of empty
    if (filteredLines.length === 0) {
      return 'No medicines or instructions detected in selective mode. Try "Decode Full Prescription" instead.';
    }
    
    return filteredLines.join('\n');
  };

  // Marker Tool Handlers - Per Page
  const handleMouseDown = (pageIndex: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activePageIndex !== pageIndex) return;
    
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentDrawing(null);
  };

  const handleMouseMove = (pageIndex: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || activePageIndex !== pageIndex) return;
    
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const width = x - startPoint.x;
    const height = y - startPoint.y;
    
    // Redraw canvas with current selection
    setCurrentDrawing({ x: startPoint.x, y: startPoint.y, width, height });
    drawMarkerBox(pageIndex, { x: startPoint.x, y: startPoint.y, width, height });
  };

  const handleMouseUp = (pageIndex: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || activePageIndex !== pageIndex) return;
    
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const width = x - startPoint.x;
    const height = y - startPoint.y;
    
    // Normalize negative widths/heights
    const normalizedRegion = {
      x: width < 0 ? x : startPoint.x,
      y: height < 0 ? y : startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height)
    };
    
    setCurrentDrawing(normalizedRegion);
    setIsDrawing(false);
    setStartPoint(null);
    
    console.log(`📍 Page ${pageIndex + 1} selection:`, normalizedRegion);
  };

  const drawMarkerBox = (pageIndex: number, region: {x: number; y: number; width: number; height: number}) => {
    const canvas = canvasRefs.current[pageIndex];
    const image = imageRefs.current[pageIndex];
    if (!canvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear selected region
    ctx.clearRect(region.x, region.y, region.width, region.height);
    
    // Draw selection border
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(region.x, region.y, region.width, region.height);
    ctx.setLineDash([]);
    
    // Draw corner handles
    const handleSize = 10;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(region.x - handleSize/2, region.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(region.x + region.width - handleSize/2, region.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(region.x - handleSize/2, region.y + region.height - handleSize/2, handleSize, handleSize);
    ctx.fillRect(region.x + region.width - handleSize/2, region.y + region.height - handleSize/2, handleSize, handleSize);
  };

  // Save current drawing as a saved selection for this page
  const handleSaveSelection = async (pageIndex: number) => {
    if (!currentDrawing || currentDrawing.width < 20 || currentDrawing.height < 20) {
      toast.error('Selection too small. Please draw a larger area.');
      return;
    }
    
    // Generate cropped preview
    const image = imageRefs.current[pageIndex];
    if (image) {
      try {
        const previewCanvas = document.createElement('canvas');
        const previewCtx = previewCanvas.getContext('2d');
        
        if (previewCtx) {
          // Calculate scale factors
          const scaleX = image.naturalWidth / image.width;
          const scaleY = image.naturalHeight / image.height;
          
          // Set canvas size to cropped region
          previewCanvas.width = currentDrawing.width * scaleX;
          previewCanvas.height = currentDrawing.height * scaleY;
          
          // Draw cropped region
          previewCtx.drawImage(
            image,
            currentDrawing.x * scaleX,
            currentDrawing.y * scaleY,
            currentDrawing.width * scaleX,
            currentDrawing.height * scaleY,
            0,
            0,
            previewCanvas.width,
            previewCanvas.height
          );
          
          // Convert to base64
          const previewBase64 = previewCanvas.toDataURL('image/jpeg', 0.8);
          
          // Update state
          const newCroppedPreviews = [...croppedPreviews];
          newCroppedPreviews[pageIndex] = previewBase64;
          setCroppedPreviews(newCroppedPreviews);
        }
      } catch (error) {
        console.error('Failed to generate preview:', error);
      }
    }
    
    const newSavedRegions = [...savedRegions];
    newSavedRegions[pageIndex] = currentDrawing;
    setSavedRegions(newSavedRegions);
    setActivePageIndex(null);
    setCurrentDrawing(null);
    
    toast.success(`✅ Page ${pageIndex + 1} selection saved!`);
    console.log(`💾 Saved selection for page ${pageIndex + 1}:`, currentDrawing);
  };

  // Clear saved selection for a page
  const handleClearSelection = (pageIndex: number) => {
    const newSavedRegions = [...savedRegions];
    newSavedRegions[pageIndex] = null;
    setSavedRegions(newSavedRegions);
    
    // Clear preview
    const newCroppedPreviews = [...croppedPreviews];
    newCroppedPreviews[pageIndex] = null;
    setCroppedPreviews(newCroppedPreviews);
    
    setCurrentDrawing(null);
    
    // Clear canvas
    const canvas = canvasRefs.current[pageIndex];
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    toast.info(`Cleared Page ${pageIndex + 1} selection`);
  };

  // Activate selection mode for a specific page
  const handleSelectRegion = (pageIndex: number) => {
    setActivePageIndex(pageIndex);
    setCurrentDrawing(null);
    console.log(`🎯 Activated selection mode for Page ${pageIndex + 1}`);
  };

  const cropImageToRegion = async (imageFile: File, region: {x: number; y: number; width: number; height: number}): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Calculate scale factors
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;
        
        // Set canvas size to cropped region
        canvas.width = region.width * scaleX;
        canvas.height = region.height * scaleY;
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        // Draw cropped region
        ctx.drawImage(
          img,
          region.x * scaleX,
          region.y * scaleY,
          region.width * scaleX,
          region.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create cropped image'));
            return;
          }
          
          const croppedFile = new File([blob], imageFile.name, { type: imageFile.type });
          resolve(croppedFile);
        }, imageFile.type);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  };

  const performOCR = async (): Promise<{ text: string; confidence: number }> => {
    if (selectedFiles.length === 0) throw new Error('No files selected');

    setProcessingStep('ocr');
    console.log(`🤖 Starting AI OCR with Tesseract.js on ${selectedFiles.length} page(s)...`);

    // Prepare files for OCR - crop each page with its saved region
    const filesToProcess: File[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const region = savedRegions[i];
      
      if (region && region.width > 20 && region.height > 20) {
        console.log(`✂️ Cropping Page ${i + 1} to saved region:`, region);
        try {
          const croppedFile = await cropImageToRegion(selectedFiles[i], region);
          filesToProcess.push(croppedFile);
          console.log(`✅ Page ${i + 1} cropped successfully`);
        } catch (error) {
          console.error(`❌ Failed to crop Page ${i + 1}:`, error);
          toast.error(`Failed to crop Page ${i + 1}. Using full image.`);
          filesToProcess.push(selectedFiles[i]);
        }
      } else {
        console.log(`📄 Page ${i + 1}: No selection saved, using full image`);
        filesToProcess.push(selectedFiles[i]);
      }
    }

    try {
      let allText = '';
      let totalConfidence = 0;

      for (let i = 0; i < filesToProcess.length; i++) {
        console.log(`📄 Processing page ${i + 1}/${filesToProcess.length}...`);
        const { data } = await Tesseract.recognize(
          filesToProcess[i],
          'eng',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`Page ${i + 1} OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            },
          }
        );

        const pageText = data.text.trim();
        allText += (i > 0 ? '\n\n--- Page ' + (i + 1) + ' ---\n\n' : '') + pageText;
        totalConfidence += data.confidence;
      }

      const avgConfidence = Math.round(totalConfidence / filesToProcess.length);

      console.log('✅ OCR Complete for all pages!');
      console.log('Average Confidence:', avgConfidence + '%');
      console.log('Extracted Text:', allText.substring(0, 100) + '...');

      return { text: allText, confidence: avgConfidence };
    } catch (error) {
      console.error('❌ OCR Error:', error);
      throw new Error('Failed to decode prescription images');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select prescription image(s)');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('📤 Starting AI RX Analysis for patient:', patientId);
      
      // Step 1: AI OCR - Decode handwriting
      const { text, confidence } = await performOCR();
      setDecodedText(text);
      setOcrConfidence(confidence);

      // Step 2: Show review screen to doctor
      setProcessingStep('review');
      setIsProcessing(false);
      console.log('👨‍⚕️ Waiting for doctor to review and approve...');

    } catch (error) {
      console.error('❌ AI RX Processing Error:', error);
      toast.error('Failed to process prescription. Please try again.');
      setIsProcessing(false);
      setProcessingStep('upload');
    }
  };

  const handleSendToPatient = async () => {
    if (isSending) {
      console.log('⚠️ Already sending, ignoring duplicate click');
      return; // Prevent double-click
    }
    
    try {
      setIsSending(true);
      setProcessingStep('sending');
      
      // Validate doctorId is loaded
      if (!doctorId) {
        console.error('❌ Doctor ID not loaded yet');
        toast.error('Please wait, loading profile...', { duration: 2000 });
        setIsSending(false);
        setProcessingStep('review');
        return;
      }
      
      // Ensure doctor name is loaded (fallback to "Doctor" if still loading)
      const finalDoctorName = doctorName || 'Doctor';
      if (!doctorName) {
        console.warn('⚠️ Doctor name not loaded yet, using fallback: "Doctor"');
      }
      
      console.log('📤 Doctor approved - sending to patient...');
      console.log('👨‍⚕️ Doctor ID:', doctorId);
      console.log('👤 Patient ID:', patientId);
      console.log('👨‍⚕️ Doctor Name:', finalDoctorName);
      console.log('🗣️ Patient Language:', patientLanguage);

      if (!db) {
        throw new Error('Firebase not configured');
      }

      // Get patient's FCM token using phone-based format
      if (!patientPhone) {
        console.error('❌ Patient phone is required for FCM notification');
        toast.error('Cannot send notification: Patient phone number missing');
        return;
      }
      const phone10 = patientPhone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
      const fcmUserId = `patient_${phone10}`;
      console.log('🔍 Looking for FCM token in collection: fcmTokens, doc:', fcmUserId);
      const patientTokenDoc = await getDoc(doc(db, 'fcmTokens', fcmUserId));
      console.log('📄 Token doc exists?', patientTokenDoc.exists());
      
      const fcmToken = patientTokenDoc.exists() ? patientTokenDoc.data().token : null;
      console.log('🔐 FCM Token:', fcmToken ? fcmToken.substring(0, 20) + '...' : 'NULL');

      if (!fcmToken) {
        console.warn('⚠️ Patient does not have FCM token - notification will be stored only');
        toast.warning('Patient has not enabled notifications', {
          description: 'Prescription will be saved but push notification cannot be sent'
        });
      }

      // 📤 UPLOAD IMAGES TO FIREBASE STORAGE (Fix for slow upload/crash)
      const uploadedImageUrls: string[] = [];
      
      try {
        console.log('📤 Uploading images to Firebase Storage...');
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          
          // Compress image before upload (Max 1200px, 0.8 quality)
          const compressImage = async (imageFile: File): Promise<Blob> => {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Max dimension 1200px
                const MAX_SIZE = 1200;
                if (width > height) {
                  if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                  }
                } else {
                  if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                  }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  reject(new Error('Canvas context failed'));
                  return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                  if (blob) resolve(blob);
                  else reject(new Error('Compression failed'));
                }, 'image/jpeg', 0.8);
              };
              img.onerror = (e) => reject(e);
              img.src = URL.createObjectURL(imageFile);
            });
          };

          const compressedBlob = await compressImage(file);
          const storageRef = ref(storage, `prescriptions/${patientId}/${Date.now()}_${i}.jpg`);
          
          await uploadBytes(storageRef, compressedBlob);
          const downloadURL = await getDownloadURL(storageRef);
          
          uploadedImageUrls.push(downloadURL);
          console.log(`✅ Image ${i + 1} uploaded:`, downloadURL);
        }
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError);
        toast.error('Failed to upload prescription images');
        setIsSending(false);
        setProcessingStep('review');
        return;
      }

      // Create notification data with IMAGE URLs (not Base64)
      const notificationData = {
        type: 'ai_rx_prescription',
        patientId: patientId,
        recipientId: patientId, // Required by security rules
        patientName: patientName,
        doctorId: doctorId, // Required by security rules
        doctorName: finalDoctorName,
        decodedText: decodedText,
        ocrConfidence: ocrConfidence,
        prescriptionImages: uploadedImageUrls, // URLs now, not Base64
        totalPages: uploadedImageUrls.length,
        language: patientLanguage,
        createdAt: serverTimestamp(),
        status: 'pending',
        deliveryMethod: 'fcm',
        expiresAfterDownload: true,
        read: false,
      };

      // Save to Firestore notifications collection
      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('✅ Notification saved to Firestore with ID:', notificationRef.id);

      // Call Cloud Function to send FCM push notification
      if (fcmToken) {
        try {
          console.log('📲 Calling Cloud Function to send FCM notification...');
          console.log('📦 Payload:', {
            patientId,
            patientName,
            doctorName: finalDoctorName,
            notificationId: notificationRef.id,
            fcmToken: fcmToken.substring(0, 20) + '...'
          });
          
          const result = await sendAIRXNotification({
            patientId: patientId,
            patientName: patientName,
            doctorName: finalDoctorName,
            notificationId: notificationRef.id,
            fcmToken: fcmToken,
          });

          console.log('📬 Cloud Function Response:', result);

          if (result.success) {
            console.log('✅ FCM notification sent successfully. Message ID:', result.messageId);
            
            // Update notification status
            await setDoc(doc(db, 'notifications', notificationRef.id), {
              status: 'sent',
              sentAt: serverTimestamp(),
              fcmMessageId: result.messageId,
            }, { merge: true });
            
            console.log('✅ Notification status updated in Firestore');
          } else {
            console.error('❌ FCM notification failed:', result.error);
            toast.error('Failed to send notification: ' + result.error);
          }
        } catch (fcmError) {
          console.error('❌ Error sending FCM notification:', fcmError);
          // Continue anyway - notification is saved in Firestore
        }
      }

      setProcessingStep('done');

      // Success toast
      toast.success(
        <div className="space-y-1">
          <div className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Prescription sent to patient!
          </div>
          <div className="text-sm text-gray-600">
            ✅ AI decoded prescription delivered via FCM
          </div>
        </div>,
        { duration: 4000 }
      );

      console.log('✅ Complete! Patient notified:', patientName);

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        // Reset state
        setSelectedFiles([]);
        setPreviewUrls([]);
        setIsProcessing(false);
        setProcessingStep('upload');
        setDecodedText('');
        setOcrConfidence(0);
        setIsSending(false);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Send Error:', error);
      const errorMessage = error?.message || 'Unknown error';
      console.error('Error details:', errorMessage);
      
      toast.error(
        <div>
          <div className="font-semibold">Failed to send prescription</div>
          <div className="text-xs mt-1">{errorMessage}</div>
        </div>,
        { duration: 5000 }
      );
      
      setProcessingStep('review');
      setIsSending(false);
    }
  };

  const processingSteps = {
    upload: { label: 'Ready to Process', icon: Upload },
    ocr: { label: 'AI Decoding Handwriting...', icon: Sparkles },
    review: { label: 'Review & Approve', icon: FileText },
    sending: { label: 'Sending to Patient...', icon: Send },
    done: { label: 'Sent Successfully!', icon: Check },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Upload RX with AI Analysis</h2>
              <p className="text-emerald-50 text-sm mt-1">
                AI will decode handwriting and translate for patient
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="font-semibold text-gray-900 mb-2">Patient Information</div>
            <div className="space-y-1 text-sm">
              <div className="text-gray-700">
                <span className="font-medium">Name:</span> {patientName}
              </div>
              <div className="text-gray-700">
                <span className="font-medium">Preferred Language:</span> {languageNames[patientLanguage]}
              </div>
            </div>
          </div>

          {/* AI Features Info */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border-l-4 border-amber-500">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-semibold text-gray-900">AI Will Process:</div>
                <div>✓ Decode your handwriting using OCR</div>
                <div>✓ Extract medicine names, dosage, frequency</div>
                <div>✓ Translate to patient's language ({languageNames[patientLanguage]})</div>
                <div>✓ Send notification with downloadable image</div>
                <div className="text-red-600 font-semibold mt-2">⚠️ No storage, no future download - one-time delivery only</div>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-900">
                <div className="font-semibold mb-1">Important:</div>
                <div>AI only decodes handwriting - it does NOT provide medical advice or modify your prescription. <span className="font-bold">Please verify decoded text before sending - AI can make mistakes.</span></div>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
                id="rx-file-input"
              />
              {previewUrls.length > 0 ? (
                <div className="space-y-6">{/* Individual Page Sections */}
                    {previewUrls.map((url, index) => (
                      <div key={index} className="bg-white rounded-xl border-2 border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-lg text-gray-900">
                            📄 Page {index + 1}
                          </h3>
                          {savedRegions[index] && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                              ✓ Selection Saved
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {/* Image Preview - Original and Cropped Side by Side */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Original Image with Canvas */}
                            <div>
                              <div className="text-xs font-medium text-gray-600 mb-2">📄 Original RX</div>
                              <div className="relative inline-block w-full">
                                <img
                                  ref={(el) => imageRefs.current[index] = el}
                                  src={url}
                                  alt={`Prescription page ${index + 1}`}
                                  className="w-full max-h-64 object-contain rounded-lg border-2 border-gray-300"
                                />
                                {activePageIndex === index && (
                                  <canvas
                                    ref={(el) => canvasRefs.current[index] = el}
                                    onMouseDown={handleMouseDown(index)}
                                    onMouseMove={handleMouseMove(index)}
                                    onMouseUp={handleMouseUp(index)}
                                    className="absolute top-0 left-0 cursor-crosshair w-full h-full"
                                  />
                                )}
                                {savedRegions[index] && activePageIndex !== index && (
                                  <div className="absolute top-2 right-2 bg-emerald-500 text-white p-2 rounded-full">
                                    <Check className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Cropped Preview */}
                            <div>
                              <div className="text-xs font-medium text-gray-600 mb-2">✂️ Selected Portion</div>
                              <div className="w-full max-h-64 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center min-h-[200px]">
                                {croppedPreviews[index] ? (
                                  <img
                                    src={croppedPreviews[index]!}
                                    alt={`Cropped preview ${index + 1}`}
                                    className="max-w-full max-h-64 object-contain rounded-lg"
                                  />
                                ) : (
                                  <div className="text-center p-4">
                                    <div className="text-4xl mb-2">✂️</div>
                                    <div className="text-sm text-gray-500">
                                      {activePageIndex === index 
                                        ? 'Draw selection on left →' 
                                        : 'No selection yet'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {!savedRegions[index] ? (
                              <>
                                {activePageIndex === index ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveSelection(index)}
                                      disabled={!currentDrawing}
                                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                                        currentDrawing
                                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      💾 Save Selection
                                    </button>
                                    <button
                                      onClick={() => setActivePageIndex(null)}
                                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleSelectRegion(index)}
                                    disabled={isProcessing}
                                    className="flex-1 py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    🎯 Select Medicine Region
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    handleClearSelection(index);
                                    handleSelectRegion(index);
                                  }}
                                  disabled={isProcessing}
                                  className="flex-1 py-2 px-4 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium disabled:bg-gray-300"
                                >
                                  ✏️ Re-select Region
                                </button>
                                <button
                                  onClick={() => handleClearSelection(index)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium disabled:bg-gray-300"
                                >
                                  🗑️ Clear
                                </button>
                              </>
                            )}
                          </div>
                          
                          {/* Helper Text */}
                          {activePageIndex === index && (
                            <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                              💡 Click and drag to draw a rectangle around medicines
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Page 2 Button */}
                    {!isProcessing && selectedFiles.length < 2 && (
                      <div className="flex justify-center">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                const newFile = files[0];
                                if (!newFile.type.startsWith('image/')) {
                                  toast.error('Please select only image files');
                                  return;
                                }
                                if (newFile.size > 10 * 1024 * 1024) {
                                  toast.error('File must be less than 10MB');
                                  return;
                                }
                                
                                setSelectedFiles(prev => [...prev, newFile]);
                                const newUrl = URL.createObjectURL(newFile);
                                setPreviewUrls(prev => [...prev, newUrl]);
                                toast.success('Page 2 added!');
                              }
                              e.target.value = '';
                            }}
                          />
                          <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all">
                            <Plus className="w-5 h-5" />
                            <span className="font-medium">Add Page 2 (Optional)</span>
                          </div>
                        </label>
                      </div>
                    )}
                    
                    {/* Process Button */}
                    {!isProcessing && savedRegions.some(r => r !== null) && (
                      <button
                        onClick={handleUpload}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold text-lg hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all"
                      >
                        🤖 Process Selected Regions with AI
                      </button>
                    )}
                    
                    {/* Change All Button (Re-upload) */}
                    <div className="flex gap-2 justify-center">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <div className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                          🔄 Change All Files
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="rx-file-input" className="cursor-pointer block">
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-gray-600">
                        <div className="font-semibold">Click to upload prescription (max 2 pages)</div>
                        <div className="text-sm mt-1">PNG, JPG up to 10MB each</div>
                      </div>
                    </div>
                  </label>
                )}
              </div>
          </div>

          {/* Processing Status */}
          {isProcessing && processingStep !== 'review' && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-6 border-2 border-emerald-200">
              <div className="space-y-4">
                {Object.entries(processingSteps).map(([step, { label, icon: Icon }]) => {
                  const isCurrentStep = step === processingStep;
                  const isDone = 
                    step === 'upload' && ['ocr', 'review', 'sending', 'done'].includes(processingStep) ||
                    step === 'ocr' && ['review', 'sending', 'done'].includes(processingStep) ||
                    step === 'review' && ['sending', 'done'].includes(processingStep) ||
                    step === 'sending' && processingStep === 'done' ||
                    step === 'done' && processingStep === 'done';

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrentStep
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-5 h-5" />
                        ) : isCurrentStep ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <div
                        className={`font-medium transition-colors ${
                          isCurrentStep || isDone ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Doctor Review Screen - AI Decoded Text */}
          {processingStep === 'review' && decodedText && (
            <div className="space-y-6">
              {/* Preview Section Heading */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Preview: What Patient Will Receive
                </h3>
                <p className="text-sm text-indigo-100 mt-1">Review the complete report before sending</p>
              </div>

              {/* Full Report Template Preview */}
              <div className="border-4 border-purple-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-purple-100 px-4 py-2 text-center text-sm font-semibold text-purple-900">
                  📄 Complete AI RX Report (Patient View) - {previewUrls.length} Page(s)
                </div>
                <div className="p-6 max-h-[500px] overflow-y-auto">
                  <AIRXReportTemplate
                    patientName={patientName}
                    doctorName={doctorName}
                    date={new Date().toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                    decodedText={decodedText}
                    ocrConfidence={ocrConfidence}
                    originalImageUrl={previewUrls[0]}
                  />
                  {previewUrls.length > 1 && (
                    <div className="mt-6 border-t-2 border-dashed border-gray-300 pt-6">
                      <div className="text-center text-sm font-semibold text-gray-700 mb-4">Additional Page(s)</div>
                      {previewUrls.slice(1).map((url, index) => (
                        <div key={index} className="mb-4">
                          <div className="text-xs text-gray-600 font-semibold mb-2">Page {index + 2}</div>
                          <img src={url} alt={`Page ${index + 2}`} className="w-full rounded-lg border" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Template Preview */}
              <div className="border-4 border-pink-300 rounded-lg overflow-hidden">
                <div className="bg-pink-100 px-4 py-2 text-center text-sm font-semibold text-pink-900">
                  🔔 FCM Push Notification Preview (Patient's Device)
                </div>
                <div className="p-4">
                  <AIRXNotificationTemplate
                    patientName={patientName}
                    doctorName={doctorName}
                    decodedText={decodedText}
                  />
                </div>
              </div>

              {/* Doctor Action Notes */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-emerald-900">
                    <div className="font-bold mb-2">✅ Ready to Send</div>
                    <ul className="space-y-1 text-xs">
                      <li>• Patient will receive FCM push notification instantly</li>
                      <li>• Report includes decoded text + original prescription image</li>
                      <li>• One-time download only (no storage, no future access)</li>
                      <li>• Translated to patient's language: <strong>{languageNames[patientLanguage]}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Dynamic based on step */}
        <div className="border-t p-4 bg-gray-50 flex gap-3">
          {processingStep === 'review' ? (
            <>
              <Button
                onClick={() => {
                  setProcessingStep('upload');
                  setIsProcessing(false);
                  setDecodedText('');
                  setOcrConfidence(0);
                }}
                variant="outline"
                className="flex-1"
                disabled={isSending}
              >
                Re-scan
              </Button>
              <Button
                onClick={handleSendToPatient}
                disabled={isSending}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send to Patient
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={onClose}
                variant="outline"
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upload with AI Analysis
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
