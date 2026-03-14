import { X, Upload, Package, Link as LinkIcon, IndianRupee, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  externalLink?: string;
  stock: number;
  category: string;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  editProduct?: Product | null;
}

export default function AddProductModal({
  isOpen,
  onClose,
  onSave,
  editProduct,
}: AddProductModalProps) {
  const [productData, setProductData] = useState<Product>(
    editProduct || {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      externalLink: '',
      stock: 0,
      category: 'Medicine',
    }
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(editProduct?.imageUrl || '');

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setProductData({ ...productData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!productData.name || !productData.price || !productData.imageUrl) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(productData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1419] rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-[#0f1419]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white">{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <p className="text-gray-400 text-sm">Add product to your e-commerce store</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product Image */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Product Image <span className="text-red-400">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
              {imagePreview ? (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                      setProductData({ ...productData, imageUrl: '' });
                    }}
                    variant="outline"
                    className="border-gray-700 text-gray-400 hover:text-white"
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageIcon className="w-12 h-12 text-gray-500 mx-auto" />
                  <p className="text-gray-400">
                    <label className="text-blue-400 hover:text-blue-300 cursor-pointer">
                      Browse image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-gray-500 text-sm">Recommended: 800x800px, JPG or PNG</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={productData.name}
              onChange={(e) => setProductData({ ...productData, name: e.target.value })}
              placeholder="e.g., Vitamin D3 Supplement"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Product Description
            </label>
            <textarea
              value={productData.description}
              onChange={(e) => setProductData({ ...productData, description: e.target.value })}
              placeholder="Describe your product, benefits, usage instructions..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 min-h-[100px] resize-none"
            />
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Price (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  value={productData.price}
                  onChange={(e) => setProductData({ ...productData, price: Number(e.target.value) })}
                  placeholder="299"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Stock Quantity
              </label>
              <input
                type="number"
                value={productData.stock}
                onChange={(e) => setProductData({ ...productData, stock: Number(e.target.value) })}
                placeholder="100"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Category
            </label>
            <select
              value={productData.category}
              onChange={(e) => setProductData({ ...productData, category: e.target.value })}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Medicine">Medicine</option>
              <option value="Supplement">Supplement</option>
              <option value="Equipment">Medical Equipment</option>
              <option value="Personal Care">Personal Care</option>
              <option value="Service">Service</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* External Link */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              External Link (Optional)
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="url"
                value={productData.externalLink}
                onChange={(e) => setProductData({ ...productData, externalLink: e.target.value })}
                placeholder="https://example.com/product"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Add a link to external product page or service (e.g., Amazon, your own website)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800 sticky bottom-0 bg-[#0f1419]">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Package className="w-4 h-4 mr-2" />
            {editProduct ? 'Update Product' : 'Add Product'}
          </Button>
        </div>
      </div>
    </div>
  );
}

