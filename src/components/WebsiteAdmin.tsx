import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from "lucide-react";

type EntityType =
  | "products"
  | "categories"
  | "collections"
  | "addon_groups"
  | "pricing_rules"
  | "posts"
  | "orders";

export default function WebsiteAdmin({
  token,
  showAlert,
  showConfirm,
  onDataChange,
}: {
  token: string;
  showAlert: any;
  showConfirm: any;
  onDataChange?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<EntityType>("products");
  const [selectedProductCategoryId, setSelectedProductCategoryId] = useState<number | 'all'>('all');
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [globalAddonGroups, setGlobalAddonGroups] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [presetInclusions, setPresetInclusions] = useState<string[]>([]);
  const [presetVariants, setPresetVariants] = useState<any[]>([]);
  const [orderMonthFilter, setOrderMonthFilter] = useState<'all' | string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'unprocessed' | 'processed'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  // Modals for editing presets
  const [isEditingPresetInclusions, setIsEditingPresetInclusions] = useState(false);
  const [isEditingPresetVariants, setIsEditingPresetVariants] = useState(false);

  const fetchFilters = async () => {
    try {
      const [catsRes, colsRes, addonsRes, incRes, varRes, rulesRes] = await Promise.all([
        fetch(`/api/admin/website/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/website/collections`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/website/addon_groups`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/website/settings/preset_inclusions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/website/settings/preset_variants`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/website/pricing_rules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (catsRes.ok) setCategories(await catsRes.json());
      if (colsRes.ok) setCollections(await colsRes.json());
      if (addonsRes.ok) setGlobalAddonGroups(await addonsRes.json());
      if (incRes.ok) setPresetInclusions(await incRes.json());
      if (varRes.ok) setPresetVariants(await varRes.json());
      if (rulesRes.ok) setPricingRules(await rulesRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const savePreset = async (key: string, value: any) => {
    try {
      await fetch(`/api/admin/website/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(value)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async (type: EntityType) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/website/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = async (direction: 'up' | 'down', currentId: number, currentList: any[]) => {
    if (activeTab !== 'products' && activeTab !== 'collections') return;
    
    const currentIndex = currentList.findIndex(item => item.id === currentId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === currentList.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapItem = currentList[swapIndex];
    const currentItem = currentList[currentIndex];

    // Find their indices in the main data array
    const dataIndex1 = data.findIndex(item => item.id === currentItem.id);
    const dataIndex2 = data.findIndex(item => item.id === swapItem.id);

    if (dataIndex1 === -1 || dataIndex2 === -1) return;

    const newData = [...data];
    [newData[dataIndex1], newData[dataIndex2]] = [newData[dataIndex2], newData[dataIndex1]];

    const sortedData = newData.map((item, i) => ({ ...item, sort_order: i }));
    setData(sortedData);

    try {
      const endpoint = activeTab === 'products' ? '/api/admin/website/products/reorder' : '/api/admin/website/collections/reorder';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: sortedData.map(item => ({ id: item.id, sort_order: item.sort_order }))
        })
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch(err) {
      console.error(err);
      fetchData(activeTab);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchData(activeTab);
    setEditingItem(null);
  }, [activeTab]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (isUploadingImage) return;
    setIsUploadingImage(true);

    try {
      const url = await uploadImageFile(file);
      if (url) {
        setEditingItem((prev: any) => {
          if (!prev) return prev;
          const newImages = [...(prev.images || [])];
          if (index >= newImages.length) {
            newImages.push(url);
          } else {
            newImages[index] = url;
          }
          return { ...prev, images: newImages };
        });
      }
    } catch (err: any) {
      showAlert("錯誤", "上傳發生錯誤: " + err.message);
    } finally {
      e.target.value = "";
      setIsUploadingImage(false);
    }
  };

  const uploadImageFile = async (fileRaw: File): Promise<string | null> => {
    let file = fileRaw;
    if (file.size > 2 * 1024 * 1024) {
      try {
        const img = document.createElement("img");
        const canvas = document.createElement("canvas");
        const url = URL.createObjectURL(file);
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });

        let width = img.width;
        let height = img.height;
        const maxDim = 2400;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
        if (blob) {
          file = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" });
        }
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Image compression failed", err);
      }
    }

    if (file.size > 10 * 1024 * 1024) {
      showAlert("錯誤", "圖片大於 10MB");
      return null;
    }

    const doUpload = async (autoRename: boolean): Promise<any> => {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = autoRename ? "/api/admin/upload?autoRename=true" : "/api/admin/upload";
      return await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
    };

    let res = await doUpload(false);
    
    if (res.status === 409) {
       if (confirm(`圖片名稱「${file.name}」已存在，是否自動加上時間戳記避免覆蓋並繼續上傳？\n(若選擇取消，則停止上傳)`)) {
          res = await doUpload(true);
       } else {
          return null; // User cancelled
       }
    }

    if (res.ok) {
      const data = await res.json();
      return data.url;
    } else {
      if (res.status === 401 || res.status === 403) {
         showAlert("錯誤", "登入已過期，請重新整理頁面重新登入");
         return null;
      }
      const text = await res.text();
      let errStr = "上傳失敗";
      try { const j = JSON.parse(text); if (j.error) errStr = j.error; } catch(e) {}
      showAlert("錯誤", `HTTP ${res.status}: ${res.statusText} - ${errStr}`);
      return null;
    }
  };

  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, optionIndex: number) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (isUploadingImage) return;
    setIsUploadingImage(true);

    try {
      const url = await uploadImageFile(file);
      if (url) {
        setEditingItem((prev: any) => {
           if (!prev) return prev;
           let newOpts = [...(typeof prev.options === 'string' ? JSON.parse(prev.options || '[]') : prev.options || [])];
           newOpts[optionIndex] = {...newOpts[optionIndex], image: url};
           return { ...prev, options: newOpts };
        });
      }
    } catch (err: any) {
      showAlert("錯誤", "上傳發生錯誤: " + err.message);
    } finally {
      e.target.value = "";
      setIsUploadingImage(false);
    }
  };

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (isUploadingImage) return;
    setIsUploadingImage(true);
    
    try {
      const url = await uploadImageFile(file);
      if (url) {
        setEditingItem((prev: any) => {
           if (!prev) return prev;
           let newVts = [...(prev.variant_items || [])];
           newVts[variantIndex] = {...newVts[variantIndex], image: url};
           return { ...prev, variant_items: newVts };
        });
      }
    } catch (err: any) {
      showAlert("錯誤", "上傳發生錯誤: " + err.message);
    } finally {
      e.target.value = "";
      setIsUploadingImage(false);
    }
  };

  const handlePresetVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (isUploadingImage) return;
    setIsUploadingImage(true);
    
    try {
      const url = await uploadImageFile(file);
      if (url) {
        setPresetVariants((prev: any) => {
           let newVts = [...prev];
           newVts[variantIndex] = {...newVts[variantIndex], image: url};
           return newVts;
        });
      }
    } catch (err: any) {
      showAlert("錯誤", "上傳發生錯誤: " + err.message);
    } finally {
      e.target.value = "";
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imgUrl = (editingItem.images || [])[index];
    if (imgUrl) {
      if (!confirm(`確定要從系統中永久刪除這張圖片嗎？\n(注意：如果在其他商品或地方有使用到這張圖片，將會一併失效)`)) {
        return; // User cancelled
      }
      try {
        const token = localStorage.getItem("token");
        await fetch("/api/admin/upload", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ url: imgUrl })
        });
      } catch (err) {
        console.error("Failed to delete image", err);
      }
    }
    
    const newImages = [...(editingItem.images || [])];
    newImages.splice(index, 1);
    setEditingItem({ ...editingItem, images: newImages });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isNew = !editingItem.id;
      const method = isNew ? "POST" : "PUT";
      const url =
        `/api/admin/website/${activeTab}` + (isNew ? "" : `/${editingItem.id}`);

      let submitData = { ...editingItem };
      if (activeTab === "products") {
        submitData.variants = {
           items: submitData.variant_items || [],
           addon_group_ids: submitData.addon_group_ids || [],
           addon_group_defaults: submitData.addon_group_defaults || {}
        };
      }
      if (activeTab === "addon_groups" && typeof submitData.options === "string") {
        try {
          submitData.options = JSON.parse(submitData.options);
        } catch (e) {
          showAlert("錯誤", "選項設定 JSON 格式不正確");
          return;
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        showAlert("成功", "已成功儲存");
        setEditingItem(null);
        fetchData(activeTab);
      } else {
        if (res.status === 401 || res.status === 403) {
           showAlert("錯誤", "登入已過期，請重新整理頁面重新登入");
           return;
        }
        const text = await res.text();
        let errStr = "儲存失敗";
        try {
          const err = JSON.parse(text);
          if (err.error) errStr = err.error;
        } catch (e) {
          console.error("Failed to parse error response:", text);
        }
        showAlert("錯誤", errStr);
      }
    } catch (err: any) {
      console.error("Network or script error in handleSave:", err);
      showAlert("錯誤", "網路錯誤或發生例外: " + err.message);
    }
  };

  const handleDelete = (id: number) => {
    showConfirm("刪除", "確定要刪除這筆資料嗎？", async () => {
      try {
        const res = await fetch(`/api/admin/website/${activeTab}/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          fetchData(activeTab);
        } else {
          showAlert("錯誤", "刪除失敗");
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const renderForm = () => {
    if (!editingItem) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-stone-100">
            <h2 className="text-xl font-medium text-stone-800">
              {editingItem.id ? "編輯" : "新增"}
              {activeTab === "products"
                ? "商品"
                : activeTab === "categories"
                  ? "分類"
                  : activeTab === "collections"
                    ? "系列"
                    : activeTab === "addon_groups"
                      ? "加購項目"
                      : activeTab === "posts"
                        ? "文章"
                        : "訂單"}
            </h2>
            <button
              onClick={() => setEditingItem(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <form id="entity-form" onSubmit={handleSave} className="space-y-4">
              {(activeTab === "collections" || activeTab === "posts") && (
                <div className="flex gap-4">
                   <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        圖片上傳 ({activeTab === "collections" ? "封面縮圖" : "精選圖片"})
                      </label>
                      <div className="flex gap-4 items-center">
                         {(activeTab === "collections" ? editingItem.cover_image : editingItem.feature_image) ? (
                            <div className="flex flex-col gap-2 p-2 border border-stone-200 rounded-xl max-w-[200px]">
                               <div className="relative group aspect-square">
                                 <img src={activeTab === "collections" ? editingItem.cover_image : editingItem.feature_image} className="w-full h-full object-cover rounded-lg" alt="" />
                                 <button type="button" onClick={async () => {
                                    const imgUrl = activeTab === "collections" ? editingItem.cover_image : editingItem.feature_image;
                                    if (imgUrl) {
                                      if (!confirm(`確定要從系統中永久刪除這張圖片嗎？\n(注意：如果在其他地方有使用到這張圖片，將會一併失效)`)) {
                                        return; // User cancelled
                                      }
                                      try {
                                        const token = localStorage.getItem("token");
                                        await fetch("/api/admin/upload", {
                                          method: "DELETE",
                                          headers: {
                                            "Content-Type": "application/json",
                                            Authorization: `Bearer ${token}`
                                          },
                                          body: JSON.stringify({ url: imgUrl })
                                        });
                                      } catch (err) {
                                        console.error("Failed to delete image", err);
                                      }
                                    }
                                    setEditingItem({...editingItem, [activeTab === "collections" ? "cover_image" : "feature_image"]: ""});
                                 }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3" />
                                 </button>
                               </div>
                               <input type="text" placeholder="替代文字 (Alt)" 
                                   value={(activeTab === "collections" ? editingItem.cover_image_alt : editingItem.feature_image_alt) || ""} 
                                   onChange={e => setEditingItem({...editingItem, [activeTab === "collections" ? "cover_image_alt" : "feature_image_alt"]: e.target.value})}
                                   className="w-full px-2 py-1 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none" />
                            </div>
                         ) : (
                            <label className={`cursor-pointer border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col items-center justify-center hover:border-stone-400 hover:bg-stone-50 transition-colors ${isUploadingImage ? 'opacity-50' : ''}`}>
                               <Upload className="w-8 h-8 text-stone-400 mb-2" />
                               <span className="text-sm text-stone-500">{isUploadingImage ? "上傳中..." : "選擇圖片"}</span>
                               <input type="file" accept="image/*" className="hidden" disabled={isUploadingImage} onChange={async (e) => {
                                 let file = e.target.files?.[0];
                                 if (!file) return;
                                 setIsUploadingImage(true);
                                 try {
                                   const url = await uploadImageFile(file);
                                   if (url) {
                                      setEditingItem({...editingItem, [activeTab === "collections" ? "cover_image" : "feature_image"]: url});
                                   }
                                 } catch (err: any) {
                                   showAlert("錯誤", "上傳發生錯誤: " + err.message);
                                 } finally {
                                   setIsUploadingImage(false);
                                 }
                               }} />
                            </label>
                         )}
                      </div>
                   </div>
                </div>
              )}

              {(activeTab === "categories" ||
                activeTab === "collections" ||
                activeTab === "products" ||
                activeTab === "addon_groups" ||
                activeTab === "posts") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      標題 / 名稱 *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.title || editingItem.name || ""}
                      onBlur={async () => {
                         if (!editingItem.slug && (editingItem.title || editingItem.name) && activeTab !== "addon_groups") {
                            try {
                              const res = await fetch("/api/admin/website/translate-slug", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ text: editingItem.title || editingItem.name })
                              });
                              if (res.ok) {
                                const data = await res.json();
                                if (data.slug) {
                                  setEditingItem((prev: any) => ({ ...prev, slug: data.slug }));
                                }
                              }
                            } catch (e) { console.error(e) }
                         }
                      }}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          [activeTab === "categories" ? "name" : "title"]:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  {activeTab !== "addon_groups" && <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Slug (網址路徑) *
                      <span className="text-stone-400 font-normal ml-2 text-xs">
                        例如輸入「floral-invitation」，網址會變成
                        /products/floral-invitation. (建議使用英文和橫線)
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.slug || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, slug: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="如: floral-invitation"
                    />
                  </div>}
                  {activeTab === "collections" && <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      狀態 (在前台顯示)
                    </label>
                    <select
                      value={editingItem.is_active === undefined ? 1 : (editingItem.is_active ? 1 : 0)}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          is_active: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    >
                      <option value={1}>顯示</option>
                      <option value={0}>隱藏</option>
                    </select>
                  </div>}
                </>
              )}

              {activeTab === "addon_groups" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        輸入類型
                      </label>
                      <select
                        value={editingItem.input_type || 'select'}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            input_type: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="select">下拉選單 (單選)</option>
                        <option value="checkbox">多選框 (Checkbox)</option>
                        <option value="image_picker">圖片方塊 (單選)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        顯示區塊 (步驟/分類)
                      </label>
                      <input
                        type="text"
                        list="display-group-options"
                        value={editingItem.display_group || ""}
                        onChange={(e) => setEditingItem({...editingItem, display_group: e.target.value})}
                        placeholder="例如：信封加購區"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none mb-2"
                      />
                      <datalist id="display-group-options">
                        <option value="喜帖-加購區" />
                        <option value="結婚書約-加購區" />
                        <option value="婚禮小物-加購區" />
                        <option value="必備設計-加購區" />
                        <option value="插畫繪製-加購區" />
                        <option value="婚禮網站-加購區" />
                      </datalist>
                      <div className="flex flex-wrap items-center gap-2">
                        {['喜帖-加購區', '結婚書約-加購區', '婚禮小物-加購區', '必備設計-加購區', '插畫繪製-加購區', '婚禮網站-加購區'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setEditingItem({...editingItem, display_group: tag})}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs transition-colors"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {editingItem.input_type === 'checkbox' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        最多選擇數量 (填 0 表示無限制)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingItem.max_selections || 0}
                        onChange={(e) => setEditingItem({...editingItem, max_selections: Number(e.target.value)})}
                        className="w-full sm:w-1/2 px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingItem.is_default_for_invitation || false}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            is_default_for_invitation: e.target.checked,
                          })
                        }
                        className="rounded border-stone-300 text-rose-500 focus:ring-rose-500 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-stone-700">客製喜帖預設勾選</span>
                    </label>
                  </div>
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      加購選項清單
                    </label>
                    <div className="space-y-3">
                      {(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || []).map((opt: any, idx: number) => (
                        <div key={idx} className="flex flex-col gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                          <div className="flex gap-2 items-center">
                            <label className="flex items-center gap-1.5 min-w-max cursor-pointer" title="預設選取">
                              <input 
                                type="checkbox" 
                                checked={opt.is_default || false}
                                onChange={e => {
                                  let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                                  // If checking this, and group is single selection (max_selections = 1), we might want to uncheck others?
                                  // The user can manage this. For simplicity we just toggle it.
                                  if (e.target.checked && editingItem.max_selections === 1) {
                                    newOpts.forEach(o => o.is_default = false);
                                  }
                                  newOpts[idx].is_default = e.target.checked;
                                  setEditingItem({...editingItem, options: newOpts});
                                }}
                                className="rounded border-stone-300 text-rose-500 focus:ring-rose-500 w-4 h-4"
                              />
                              <span className="text-sm font-medium text-stone-600">預設</span>
                            </label>

                            <input 
                              type="text" 
                              placeholder="選項名稱 (例如: 無, 加購火漆蠟)" 
                              required
                              className="flex-1 px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                              value={opt.name || ''} 
                              onChange={e => {
                                let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                                newOpts[idx].name = e.target.value;
                                setEditingItem({...editingItem, options: newOpts});
                              }} 
                            />
                            <input 
                              type="number" 
                              placeholder="價格" 
                              required
                              className="w-24 px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                              value={opt.price} 
                              onChange={e => {
                                let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                                newOpts[idx].price = Number(e.target.value);
                                setEditingItem({...editingItem, options: newOpts});
                              }} 
                            />
                            <select
                               className="w-32 px-2 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                               value={opt.price_type || 'flat'}
                               onChange={e => {
                                  let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                                  newOpts[idx].price_type = e.target.value;
                                  setEditingItem({...editingItem, options: newOpts});
                               }}
                            >
                               <option value="flat">單一價格</option>
                               <option value="per_item">每份單價</option>
                               <option value="min_100_per_item">每份單價(最少100份)</option>
                            </select>
                            <button type="button" onClick={() => {
                               let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                               if (idx > 0) {
                                  [newOpts[idx - 1], newOpts[idx]] = [newOpts[idx], newOpts[idx - 1]];
                                  setEditingItem({...editingItem, options: newOpts});
                               }
                            }} className="p-2 text-stone-400 hover:text-stone-700 transition-colors" title="往上移">
                               <ArrowUp className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => {
                               let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                               if (idx < newOpts.length - 1) {
                                  [newOpts[idx + 1], newOpts[idx]] = [newOpts[idx], newOpts[idx + 1]];
                                  setEditingItem({...editingItem, options: newOpts});
                               }
                            }} className="p-2 text-stone-400 hover:text-stone-700 transition-colors" title="往下移">
                               <ArrowDown className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => {
                               let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                               newOpts.splice(idx, 1);
                               setEditingItem({...editingItem, options: newOpts});
                            }} className="p-2 text-stone-400 hover:text-red-500 transition-colors" title="刪除">
                               <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex gap-4 items-center">
                            {opt.image && (
                               <div className="flex gap-2">
                                 <div className="relative group shrink-0">
                                   <img src={opt.image} alt={opt.image_alt || opt.name || `Option ${idx}`} className="w-12 h-12 rounded object-cover border border-stone-200" />
                                   <button type="button" onClick={async () => {
                                       const imgUrl = opt.image;
                                       if (imgUrl) {
                                         if (!confirm(`確定要從系統中永久刪除這張圖片嗎？\n(注意：如果在其他地方有使用到這張圖片，將會一併失效)`)) {
                                           return; // User cancelled
                                         }
                                         try {
                                           const token = localStorage.getItem("token");
                                           await fetch("/api/admin/upload", {
                                             method: "DELETE",
                                             headers: {
                                               "Content-Type": "application/json",
                                               Authorization: `Bearer ${token}`
                                             },
                                             body: JSON.stringify({ url: imgUrl })
                                           });
                                         } catch (err) {
                                           console.error("Failed to delete image", err);
                                         }
                                       }
                                       let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                                       delete newOpts[idx].image;
                                       delete newOpts[idx].image_alt;
                                       setEditingItem({...editingItem, options: newOpts});
                                   }} className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <X className="w-3 h-3" />
                                   </button>
                                 </div>
                                 <input
                                    type="text"
                                    placeholder="圖片替代文字 (Alt)"
                                    className="px-2 py-1 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none h-8 my-auto"
                                    value={opt.image_alt || ""}
                                    onChange={e => {
                                       let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                                       newOpts[idx].image_alt = e.target.value;
                                       setEditingItem({...editingItem, options: newOpts});
                                    }}
                                 />
                               </div>
                            )}
                            <label className="cursor-pointer text-xs flex items-center gap-1 text-stone-500 hover:text-stone-700">
                               <ImageIcon className="w-4 h-4" />
                               {opt.image ? '更換圖片' : '上傳選項圖片 (選填)'}
                               <input type="file" className="hidden" accept="image/*" onChange={e => handleOptionImageUpload(e, idx)} disabled={isUploadingImage} />
                            </label>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => {
                         let newOpts = [...(typeof editingItem.options === 'string' ? JSON.parse(editingItem.options || '[]') : editingItem.options || [])];
                         newOpts.push({ name: '', price: 0, price_type: 'flat' });
                         setEditingItem({...editingItem, options: newOpts});
                      }} className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                         + 新增選項
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "products" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        基礎價格 *
                      </label>
                      <input
                        type="number"
                        required
                        value={editingItem.base_price || 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            base_price: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        狀態
                      </label>
                      <select
                        value={editingItem.is_active ? 1 : 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            is_active: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value={1}>上架</option>
                        <option value={0}>下架</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        運費 (Shipping Fee)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingItem.shipping_fee !== undefined && editingItem.shipping_fee !== null ? editingItem.shipping_fee : 120}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            shipping_fee: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        最低起訂量 (MOQ)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingItem.min_qty || 1}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            min_qty: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        商品類型 (Product Type)
                      </label>
                      <select
                        value={editingItem.product_type || 'standard'}
                        onChange={(e) => {
                          const newType = e.target.value;
                          let newEditingItem = { ...editingItem, product_type: newType };
                          if (newType === 'standard' && editingItem.product_type === 'custom_invitation') {
                             // Switch to standard: remove addon_groups that are default for invitation
                             const defaultInvitationAddons = globalAddonGroups.filter(g => g.is_default_for_invitation).map(g => g.id);
                             newEditingItem.variant_items = editingItem.variant_items || [];
                             newEditingItem.addon_group_ids = (editingItem.addon_group_ids || []).filter(
                               (id: number) => !defaultInvitationAddons.includes(id)
                             );
                          }
                          setEditingItem(newEditingItem);
                        }}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="standard">一般商品 (Standard)</option>
                        <option value="custom_invitation">客製喜帖 (Custom Invitation)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      描述 (支援 Markdown / HTML)
                    </label>
                    <textarea
                      value={editingItem.description || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none h-24"
                    />
                  </div>
                  {activeTab === "products" && (
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <p className="text-sm font-medium text-stone-800 mb-3 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-stone-500" />
                        Markdown 圖片迴圈設定 (非必填)
                      </p>
                      <p className="text-xs text-stone-500 mb-3">
                        若 Markdown 內有大量命名規律的圖片，可在此設定迴圈變數，方便前端一次展開（例如變數設為 <code>$i</code>）。<br/>
                        格式範例：<code>![Alt name...](https://.../portfolio-$i.jpg)</code>
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1">
                            圖片數量 (Length)
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="例如：22"
                            value={editingItem.image_loop_count || ""}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                image_loop_count: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1">
                            變數名稱 (Variable)
                          </label>
                          <input
                            type="text"
                            placeholder="例如：$i"
                            value={editingItem.image_loop_var || ""}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                image_loop_var: e.target.value,
                              })
                            }
                            className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        所屬分類
                      </label>
                      <select
                        value={editingItem.category_id || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            category_id: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="">無</option>
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        所屬系列
                      </label>
                      <select
                        value={editingItem.collection_id || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            collection_id: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="">無</option>
                        {collections.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        活動階梯報價規則
                      </label>
                      <select
                        value={editingItem.pricing_rule_id || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            pricing_rule_id: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="">無 / 使用預設商品定價</option>
                        {pricingRules.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-stone-100">
                    <label className="block text-sm font-medium text-stone-700 mb-3">
                      商品圖片 (最多 5 張)
                    </label>
                    <div className="grid grid-cols-5 gap-4">
                      {[0, 1, 2, 3, 4].map((index) => {
                        const imgUrl = (editingItem.images || [])[index];
                        return (
                          <div key={index} className="flex flex-col gap-2">
                            <div
                              className="relative aspect-square border border-stone-200 rounded-xl overflow-hidden bg-stone-50 flex items-center justify-center group"
                            >
                              {imgUrl ? (
                                <>
                                  <img
                                    src={imgUrl}
                                    alt={(editingItem.image_alts || [])[index] || `Product ${index}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {index > 0 && (
                                      <button type="button" onClick={(e) => {
                                          e.stopPropagation();
                                          let newImages = [...(editingItem.images || [])];
                                          let newAlts = [...(editingItem.image_alts || [])];
                                          [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
                                          [newAlts[index - 1], newAlts[index]] = [newAlts[index], newAlts[index - 1]];
                                          setEditingItem({...editingItem, images: newImages, image_alts: newAlts});
                                      }} className="bg-black/50 text-white rounded p-0.5 hover:bg-black/70">
                                        <ChevronLeft className="w-4 h-4" />
                                      </button>
                                    )}
                                    {index < (editingItem.images || []).length - 1 && (
                                      <button type="button" onClick={(e) => {
                                          e.stopPropagation();
                                          let newImages = [...(editingItem.images || [])];
                                          let newAlts = [...(editingItem.image_alts || [])];
                                          [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
                                          [newAlts[index], newAlts[index + 1]] = [newAlts[index + 1], newAlts[index]];
                                          setEditingItem({...editingItem, images: newImages, image_alts: newAlts});
                                      }} className="bg-black/50 text-white rounded p-0.5 hover:bg-black/70">
                                        <ChevronRight className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <label
                                  className={`cursor-pointer flex flex-col items-center ${isUploadingImage && index === (editingItem.images || []).length ? "text-rose-500" : "text-stone-400 hover:text-stone-600"}`}
                                >
                                  <Upload
                                    className={`w-6 h-6 mb-1 ${isUploadingImage && index === (editingItem.images || []).length ? "animate-bounce" : ""}`}
                                  />
                                  <span className="text-[10px]">
                                    {isUploadingImage &&
                                    index === (editingItem.images || []).length
                                      ? "上傳中..."
                                      : "上傳圖片"}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleImageUpload(
                                        e,
                                        (editingItem.images || []).length,
                                      )
                                    }
                                    disabled={
                                      index > (editingItem.images || []).length ||
                                      isUploadingImage
                                    } // force sequential upload
                                  />
                                </label>
                              )}
                            </div>
                            {imgUrl && (
                               <input
                                 type="text"
                                 placeholder="替代文字 (Alt)"
                                 value={(editingItem.image_alts || [])[index] || ""}
                                 onChange={(e) => {
                                   const newAlts = [...(editingItem.image_alts || [])];
                                   newAlts[index] = e.target.value;
                                   setEditingItem({...editingItem, image_alts: newAlts});
                                 }}
                                 className="w-full px-2 py-1 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                               />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-stone-100">
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-stone-700">
                          包含項目 (Inclusions)
                        </label>
                        <button type="button" onClick={() => setIsEditingPresetInclusions(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">編輯常用項目</button>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        請依序輸入本商品預設包含的內容（例如：喜帖本體、信封、貼紙）。這不是加購選項。
                      </p>
                    </div>
                    {presetInclusions.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2 text-sm p-3 bg-stone-50 rounded-lg">
                         <span className="text-stone-500 font-medium w-full text-xs">快速加入常用：</span>
                         {presetInclusions.map((pInc, idx) => (
                           <button 
                             type="button"
                             key={`p-inc-${idx}`}
                             onClick={() => {
                               let incs = [...(editingItem.inclusions || [])];
                               if (!incs.includes(pInc)) {
                                 incs.push(pInc);
                               } else {
                                 incs = incs.filter((i) => i !== pInc);
                               }
                               setEditingItem({ ...editingItem, inclusions: incs });
                             }}
                             className={`px-3 py-1 rounded-full border text-xs transition-colors ${(editingItem.inclusions || []).includes(pInc) ? "bg-stone-200 border-stone-300 text-stone-700" : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"}`}
                           >
                              {pInc} {(editingItem.inclusions || []).includes(pInc) && <CheckCircle className="w-3 h-3 inline ml-1" />}
                           </button>
                         ))}
                      </div>
                    )}
                    <div className="space-y-2 mb-4">
                       {(editingItem.inclusions || []).map((inc: string, idx: number) => (
                           <div key={`inc-${idx}`} className="flex gap-2 items-center bg-stone-50 p-2 rounded-xl border border-stone-100">
                              <input 
                                type="text"
                                placeholder="項目說明 (例如: 雙面排版設計)"
                                required
                                value={inc}
                                onChange={e => {
                                   let incs = [...(editingItem.inclusions || [])];
                                   incs[idx] = e.target.value;
                                   setEditingItem({...editingItem, inclusions: incs});
                                }}
                                className="flex-1 px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                              />
                              <button type="button" onClick={() => {
                                 let incs = [...(editingItem.inclusions || [])];
                                 incs.splice(idx, 1);
                                 setEditingItem({...editingItem, inclusions: incs});
                              }} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
                                 <X className="w-4 h-4" />
                              </button>
                           </div>
                       ))}
                       <button type="button" onClick={() => {
                          let incs = [...(editingItem.inclusions || [])];
                          incs.push("");
                          setEditingItem({...editingItem, inclusions: incs});
                       }} className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                          + 新增包含項目
                       </button>
                    </div>

                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-stone-700">
                        商品款式設定 (Variants)
                        </label>
                        <button type="button" onClick={() => setIsEditingPresetVariants(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">編輯常用款式</button>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        例如圖示中的「單卡式套餐」、「雙卡式套餐」等不同形式與對應的起跳價格，請在此處設定（不含加購項目）。
                      </p>
                    </div>
                    {presetVariants.length > 0 && (
                      <div className="mb-3 flex flex-col gap-2 text-sm p-3 bg-stone-50 rounded-lg">
                         <span className="text-stone-500 font-medium text-xs">快速加入常用：</span>
                         <div className="flex flex-wrap gap-2">
                         {presetVariants.map((pVar, idx) => {
                           const vts = editingItem.variant_items || [];
                           const isIncluded = vts.find((v: any) => v.name === pVar.name);
                           return (
                             <button 
                               type="button"
                               key={`p-var-${idx}`}
                               onClick={() => {
                                 let newVts = [...vts];
                                 if (!isIncluded) {
                                   newVts.push({ ...pVar });
                                 } else {
                                   newVts = newVts.filter((v: any) => v.name !== pVar.name);
                                 }
                                 setEditingItem({ ...editingItem, variant_items: newVts });
                               }}
                               className={`px-3 py-1.5 rounded-xl border text-xs transition-colors flex items-center gap-2 ${isIncluded ? "bg-stone-200 border-stone-300 text-stone-700" : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"}`}
                             >
                                <span className="font-medium">{pVar.name}</span>
                                <span className="text-stone-400">NT$ {pVar.price}</span>
                                {isIncluded && <CheckCircle className="w-3 h-3 text-stone-500" />}
                             </button>
                           );
                         })}
                         </div>
                      </div>
                    )}
                    <div className="space-y-3 mb-4">
                       {(editingItem.variant_items || []).map((vt: any, idx: number) => (
                           <div key={`vt-${idx}`} className="flex flex-col gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                             <div className="flex gap-2 items-center">
                               <label className="flex items-center gap-1 cursor-pointer shrink-0">
                                 <input
                                   type="checkbox"
                                   checked={vt.is_default || false}
                                   onChange={(e) => {
                                     let vts = [...(editingItem.variant_items || [])];
                                     if (e.target.checked) {
                                       vts.forEach(v => v.is_default = false);
                                     }
                                     vts[idx].is_default = e.target.checked;
                                     setEditingItem({...editingItem, variant_items: vts});
                                   }}
                                   className="rounded border-stone-300 text-rose-500 focus:ring-rose-500 w-4 h-4"
                                 />
                                 <span className="text-sm font-medium text-stone-600">預設</span>
                               </label>
                               <input
                                 type="text"
                                 placeholder="款式名稱 (如: 單卡式套餐)"
                                 required
                                 value={vt.name || ''}
                                 onChange={e => {
                                    let vts = [...(editingItem.variant_items || [])];
                                    vts[idx].name = e.target.value;
                                    setEditingItem({...editingItem, variant_items: vts});
                                 }}
                                 className="flex-1 px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                               />
                               <input
                                 type="number"
                                 placeholder="價格"
                                 required
                                 value={vt.price}
                                 onChange={e => {
                                    let vts = [...(editingItem.variant_items || [])];
                                    vts[idx].price = Number(e.target.value);
                                    setEditingItem({...editingItem, variant_items: vts});
                                 }}
                                 className="w-24 px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                               />
                               <button type="button" onClick={() => {
                                  let vts = [...(editingItem.variant_items || [])];
                                  if (idx > 0) {
                                    [vts[idx - 1], vts[idx]] = [vts[idx], vts[idx - 1]];
                                    setEditingItem({...editingItem, variant_items: vts});
                                  }
                               }} className="p-2 text-stone-400 hover:text-stone-700 transition-colors shrink-0" title="往上移">
                                  <ArrowUp className="w-4 h-4" />
                               </button>
                               <button type="button" onClick={() => {
                                  let vts = [...(editingItem.variant_items || [])];
                                  if (idx < vts.length - 1) {
                                    [vts[idx + 1], vts[idx]] = [vts[idx], vts[idx + 1]];
                                    setEditingItem({...editingItem, variant_items: vts});
                                  }
                               }} className="p-2 text-stone-400 hover:text-stone-700 transition-colors shrink-0" title="往下移">
                                  <ArrowDown className="w-4 h-4" />
                               </button>
                               <button type="button" onClick={() => {
                                  let vts = [...(editingItem.variant_items || [])];
                                  vts.splice(idx, 1);
                                  setEditingItem({...editingItem, variant_items: vts});
                               }} className="p-2 text-stone-400 hover:text-red-500 transition-colors shrink-0">
                                  <X className="w-4 h-4" />
                               </button>
                             </div>
                             <textarea
                               placeholder="備註文字 (支援 Markdown / HTML)，例如: 最經典..."
                               value={vt.description || ''}
                               onChange={e => {
                                  let vts = [...(editingItem.variant_items || [])];
                                  vts[idx].description = e.target.value;
                                  setEditingItem({...editingItem, variant_items: vts});
                               }}
                               className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none h-12"
                             />
                             <div className="flex gap-4 items-center mt-1">
                               {vt.image && (
                                  <div className="flex gap-2">
                                    <div className="relative group shrink-0">
                                      <img src={vt.image} alt={vt.image_alt || vt.name || `Variant ${idx}`} className="w-12 h-12 rounded object-cover border border-stone-200" />
                                      <button type="button" onClick={() => {
                                          let vts = [...(editingItem.variant_items || [])];
                                          delete vts[idx].image;
                                          delete vts[idx].image_alt;
                                          setEditingItem({...editingItem, variant_items: vts});
                                      }} className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <input
                                       type="text"
                                       placeholder="圖片替代文字 (Alt)"
                                       className="px-2 py-1 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none h-8 my-auto"
                                       value={vt.image_alt || ""}
                                       onChange={e => {
                                          let vts = [...(editingItem.variant_items || [])];
                                          vts[idx].image_alt = e.target.value;
                                          setEditingItem({...editingItem, variant_items: vts});
                                       }}
                                    />
                                  </div>
                               )}
                               <label className="cursor-pointer text-xs flex items-center gap-1 text-stone-500 hover:text-stone-700">
                                  <ImageIcon className="w-4 h-4" />
                                  {vt.image ? '更換圖片' : '上傳選項圖片 (選填)'}
                                  <input type="file" className="hidden" accept="image/*" onChange={e => handleVariantImageUpload(e, idx)} disabled={isUploadingImage} />
                               </label>
                             </div>
                           </div>
                       ))}
                       <button type="button" onClick={() => {
                          let vts = [...(editingItem.variant_items || [])];
                          vts.push({ name: '', price: 0, description: '' });
                          setEditingItem({...editingItem, variant_items: vts});
                       }} className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                          + 新增款式
                       </button>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">此處僅設定商品的不同款式與其對應的價格 (不含加購項目)。</p>

                    <label className="block text-sm font-medium text-stone-700 mb-1 mt-6">
                      啟用的加購項目 (Add-ons)
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                       {globalAddonGroups.map(group => {
                          const isSelected = (editingItem.addon_group_ids || []).includes(group.id);
                          return (
                            <div key={group.id} className="flex flex-col border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-colors bg-white">
                              <label className="flex items-center space-x-2 p-3 cursor-pointer hover:bg-stone-50 transition-colors">
                                <input 
                                  type="checkbox"
                                  className="rounded border-stone-300 text-rose-500 focus:ring-rose-500 w-4 h-4"
                                  checked={isSelected}
                                  onChange={(e) => {
                                     let addons = [...(editingItem.addon_group_ids || [])];
                                     if (e.target.checked) {
                                        if (!addons.includes(group.id)) addons.push(group.id);
                                     } else {
                                        addons = addons.filter(id => id !== group.id);
                                     }
                                     setEditingItem({...editingItem, addon_group_ids: addons});
                                  }}
                                />
                                <span className="text-sm text-stone-700 font-medium">{group.title}</span>
                              </label>
                              {isSelected && group.options && group.options.length > 0 && (
                                <div className="px-3 pb-3 pt-1 border-t border-stone-100 bg-stone-50/50">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] text-stone-500">商品預設選項 (選填)</label>
                                    {editingItem.addon_group_defaults?.[group.id] !== undefined && (
                                      <button 
                                        type="button" 
                                        className="text-[10px] text-rose-500 hover:text-rose-600"
                                        onClick={() => {
                                          const newDefaults = { ...(editingItem.addon_group_defaults || {}) };
                                          delete newDefaults[group.id];
                                          setEditingItem({ ...editingItem, addon_group_defaults: newDefaults });
                                        }}
                                      >
                                        清除預設 / 使用加購項目設定
                                      </button>
                                    )}
                                  </div>
                                  
                                  {group.input_type === 'checkbox' ? (
                                    <div className="grid grid-cols-1 gap-1.5 mt-2">
                                      {group.options.map((opt:any, i:number) => {
                                        const isOvr = editingItem.addon_group_defaults?.[group.id] !== undefined;
                                        const currentVal = isOvr ? (editingItem.addon_group_defaults[group.id] || []) : [];
                                        const currentArray = Array.isArray(currentVal) ? currentVal : [];
                                        const isChecked = isOvr ? currentArray.includes(opt.name) : false;
                                        
                                        return (
                                          <label key={i} className={`flex items-center space-x-1.5 text-[11px] ${!isOvr ? 'opacity-60 grayscale' : ''}`}>
                                            <input 
                                              type="checkbox"
                                              className="rounded border-stone-300 text-rose-500 focus:ring-rose-500 w-3 h-3"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                const prevArray = isOvr && Array.isArray(editingItem.addon_group_defaults?.[group.id]) 
                                                  ? editingItem.addon_group_defaults[group.id] 
                                                  : [];
                                                const newVal = e.target.checked 
                                                  ? Array.from(new Set([...prevArray, opt.name])) 
                                                  : prevArray.filter((v:any) => v !== opt.name);
                                                setEditingItem({
                                                  ...editingItem,
                                                  addon_group_defaults: {
                                                    ...(editingItem.addon_group_defaults || {}),
                                                    [group.id]: newVal
                                                  }
                                                });
                                              }}
                                            />
                                            <span className="text-stone-700">{opt.name}</span>
                                          </label>
                                        );
                                      })}
                                      {!editingItem.addon_group_defaults?.[group.id] && (
                                         <div className="text-[10px] text-stone-400 mt-1">目前使用全局設定，勾選上方項目即可覆蓋</div>
                                      )}
                                    </div>
                                  ) : (
                                    <select 
                                      className="w-full text-xs border border-stone-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                      value={editingItem.addon_group_defaults?.[group.id] ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                          const newDefaults = { ...(editingItem.addon_group_defaults || {}) };
                                          delete newDefaults[group.id];
                                          setEditingItem({ ...editingItem, addon_group_defaults: newDefaults });
                                        } else {
                                          setEditingItem({
                                            ...editingItem, 
                                            addon_group_defaults: {
                                              ...(editingItem.addon_group_defaults || {}), 
                                              [group.id]: val
                                            }
                                          });
                                        }
                                      }}
                                    >
                                      <option value="">(使用加購項目預設)</option>
                                      {group.options.map((opt:any, i:number) => (
                                        <option key={i} value={opt.name}>{opt.name}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                       })}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "posts" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      摘要
                    </label>
                    <textarea
                      value={editingItem.excerpt || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          excerpt: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none h-20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      標籤
                    </label>
                    <div className="p-3 border border-stone-200 rounded-xl bg-white space-y-3">
                       <input
                         type="text"
                         placeholder="+ 自訂標籤 (按 Enter)"
                         className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-rose-300"
                         onKeyDown={(e) => {
                           if (e.key === "Enter") {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                 const currentTags = editingItem.tags || [];
                                 if (!currentTags.includes(val)) {
                                    setEditingItem({...editingItem, tags: [...currentTags, val]});
                                 }
                                 e.currentTarget.value = "";
                              }
                           }
                         }}
                       />
                       <div className="flex flex-wrap items-center gap-2">
                         <span className="text-stone-500 text-sm mr-1">推薦標籤：</span>
                         {['喜帖文案', '婚禮靈感', '婚禮色系', '婚禮趨勢', '婚禮流程', '婚禮準備', '婚禮網站', '婚禮小物', '新人分享', '作品案例', '婚禮插畫'].map(tag => (
                            <button
                               key={tag}
                               type="button"
                               onClick={() => {
                                 const currentTags = editingItem.tags || [];
                                 if (!currentTags.includes(tag)) {
                                    setEditingItem({...editingItem, tags: [...currentTags, tag]});
                                 }
                               }}
                               className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs transition-colors"
                            >
                               + {tag}
                            </button>
                         ))}
                       </div>
                       
                       {(editingItem.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                            {editingItem.tags.map((tag: string, idx: number) => (
                               <div key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs">
                                  <span>{tag}</span>
                                  <button type="button" onClick={() => {
                                      const newTags = editingItem.tags.filter((_: string, i: number) => i !== idx);
                                      setEditingItem({...editingItem, tags: newTags});
                                  }} className="hover:text-rose-800">
                                      <X className="w-3 h-3" />
                                  </button>
                               </div>
                            ))}
                          </div>
                       )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      內文 (Markdown / HTML)
                    </label>
                    <textarea
                      value={editingItem.content || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          content: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none h-40 font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        狀態
                      </label>
                      <select
                        value={editingItem.is_published ? 1 : 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            is_published: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value={1}>發佈</option>
                        <option value={0}>草稿</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "orders" && (
                <>
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2 mb-4">
                    <h4 className="text-sm font-medium text-stone-800 border-b border-stone-200 pb-2 mb-2">
                       訂單基本資訊
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">訂單編號:</span>
                      <span className="font-medium text-stone-800">#{editingItem.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">會員帳號:</span>
                      <span className="font-medium text-stone-800">{editingItem.user_email || "訪客"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">成立時間:</span>
                      <span className="font-medium text-stone-800">
                         {editingItem.created_at ? new Date(editingItem.created_at + (editingItem.created_at.includes('Z') ? '' : 'Z')).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                    {(editingItem.rec_trade_id || editingItem.bank_transaction_id) && (
                      <>
                        <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t border-stone-200">
                          <span className="text-stone-500 flex items-center">
                              交易識別碼 (recTradeId):
                              <button onClick={async () => {
                                  try {
                                      const res = await fetch(`/api/admin/website/orders/${editingItem.id}/sync`, {
                                          method: 'POST',
                                          headers: { 'Authorization': `Bearer ${localStorage.getItem("admin_token")}` }
                                      });
                                      const data = await res.json();
                                      if (data.success) {
                                          alert(`同步成功！狀態: ${data.status}, Bank Transaction ID: ${data.bank_transaction_id}`);
                                          setEditingItem({...editingItem, status: data.status, bank_transaction_id: data.bank_transaction_id});
                                          fetchData("orders");
                                      } else {
                                          alert(`同步失敗: ${data.message || data.error}\nRaw Data: ${JSON.stringify(data.raw_data)}`);
                                      }
                                  } catch (err: any) {
                                      console.error("Sync error:", err);
                                      alert(`Error syncing: ${err.message || 'unknown'}`);
                                  }
                              }} type="button" className="ml-2 px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-xs">同步 TapPay 最新狀態</button>
                          </span>
                          <span className="font-medium text-stone-800 break-all pl-4 text-right">{editingItem.rec_trade_id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-500">銀行訂單編號 (Bank Transaction ID):</span>
                          <span className="font-medium text-stone-800 break-all pl-4 text-right">{editingItem.bank_transaction_id}</span>
                        </div>
                      </>
                    )}
                    {editingItem.payment_error && (
                      <div className="mt-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                         <strong>金流錯誤訊息:</strong> {editingItem.payment_error}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      訂單狀態
                    </label>
                    <select
                      value={editingItem.status || "pending_payment"}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    >
                      <option value="pending_payment">待付款</option>
                      <option value="paid">已付款</option>
                      <option value="processing">處理中</option>
                      <option value="shipped">已出貨</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      總金額
                    </label>
                    <input
                      type="number"
                      disabled
                      value={editingItem.total_amount || 0}
                      className="w-full px-3 py-2 border border-stone-300 bg-stone-50 text-stone-500 rounded-xl outline-none"
                    />
                  </div>
                  {editingItem.items && (
                    <div className="pt-4 border-t border-stone-100">
                      <h4 className="text-sm font-medium text-stone-800 mb-2">
                        訂單項目
                      </h4>
                      <ul className="space-y-2">
                        {editingItem.items.map((item: any) => {
                          let configArr: [string, any][] = [];
                          try {
                            if (item.config) {
                              const configObj = JSON.parse(item.config);
                              configArr = Object.entries(configObj);
                            }
                          } catch (e) {}

                          let imageUrl = "";
                          try {
                            if (item.images) {
                              const images = JSON.parse(item.images);
                              if (images.length > 0) imageUrl = images[0];
                            }
                          } catch (e) {}

                          return (
                            <li
                              key={item.id}
                              className="text-sm text-stone-600 flex gap-3 bg-stone-50 border border-stone-200 p-3 rounded-xl"
                            >
                              {imageUrl ? (
                                <img src={imageUrl} alt={item.title} className="w-16 h-16 object-cover rounded-lg border border-stone-200" />
                              ) : (
                                <div className="w-16 h-16 bg-stone-200 rounded-lg flex items-center justify-center text-stone-400">無圖</div>
                              )}
                              <div className="flex-1 flex flex-col justify-center">
                                <div className="flex justify-between font-medium text-stone-800 text-sm mb-1">
                                  <span>
                                    {item.title}
                                  </span>
                                  <span>${item.price.toLocaleString()} x {item.quantity}</span>
                                </div>
                                {configArr.length > 0 && (
                                  <div className="text-xs text-stone-500 bg-white p-2 rounded-lg border border-stone-200 mt-1 space-y-1">
                                    {configArr.map(([k, v]) => (
                                      <div key={k} className="flex gap-2">
                                        <span className="font-medium text-stone-600 min-w-max">{k}:</span>
                                        <span className="whitespace-pre-wrap">{v as string}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {editingItem.shipping_info && (
                    <div className="pt-4 border-t border-stone-100">
                      <h4 className="text-sm font-medium text-stone-800 mb-2">
                        收件資訊
                      </h4>
                      <div className="text-sm text-stone-600 bg-stone-50 p-3 rounded space-y-1">
                        <p>
                          姓名：
                          {(() => {
                            try {
                              return JSON.parse(editingItem.shipping_info).name;
                            } catch (e) {
                              return "-";
                            }
                          })()}
                        </p>
                        <p>
                          電話：
                          {(() => {
                            try {
                              return JSON.parse(editingItem.shipping_info)
                                .phone;
                            } catch (e) {
                              return "-";
                            }
                          })()}
                        </p>
                        <p>
                          地址：
                          {(() => {
                            try {
                              return JSON.parse(editingItem.shipping_info)
                                .address;
                            } catch (e) {
                              return "-";
                            }
                          })()}
                        </p>
                        {(() => {
                          try {
                            const shippingInfo = JSON.parse(editingItem.shipping_info);
                            if (shippingInfo.notes) {
                              return (
                                <div className="mt-2 text-stone-700 bg-yellow-50 p-2 rounded border border-yellow-100">
                                  <span className="font-medium mr-1">備註:</span>
                                  {shippingInfo.notes}
                                </div>
                              );
                            }
                            return null;
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "pricing_rules" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        規則名稱 *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingItem.name || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, name: e.target.value })
                        }
                        placeholder="例如: 杯墊報價"
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        報價/折價 類型
                      </label>
                      <select
                        value={editingItem.rule_type || 'volume'}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            rule_type: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="volume">階梯/數量報價 (例: 杯墊階梯價)</option>
                        <option value="bundle">組合包/總價報價 (例: 1本980, 2本1680)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      報價級距設定
                    </label>
                    <div className="space-y-3">
                      {(editingItem.tiers || []).map((tier: any, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center bg-stone-50 p-2 rounded-xl border border-stone-100">
                          {editingItem.rule_type === 'volume' ? (
                            <>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="最小數量"
                                  className="w-20 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                                  value={tier.min_qty || ''}
                                  onChange={e => {
                                    let newTiers = [...(editingItem.tiers || [])];
                                    newTiers[idx].min_qty = Number(e.target.value);
                                    setEditingItem({...editingItem, tiers: newTiers});
                                  }}
                                />
                                <span className="text-stone-500 text-sm">~</span>
                                <input
                                  type="number"
                                  placeholder="最大(空=無限)"
                                  className="w-[100px] px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                                  value={tier.max_qty || ''}
                                  onChange={e => {
                                    let newTiers = [...(editingItem.tiers || [])];
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    newTiers[idx].max_qty = val;
                                    setEditingItem({...editingItem, tiers: newTiers});
                                  }}
                                />
                                <span className="text-stone-500 text-sm">個,</span>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <span className="text-stone-500 text-sm">每份單價 $</span>
                                <input
                                  type="number"
                                  placeholder="價格"
                                  className="w-20 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                                  value={tier.unit_price || ''}
                                  onChange={e => {
                                    let newTiers = [...(editingItem.tiers || [])];
                                    newTiers[idx].unit_price = Number(e.target.value);
                                    setEditingItem({...editingItem, tiers: newTiers});
                                  }}
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-stone-500 text-sm">數量</span>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="數量"
                                  className="w-20 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                                  value={tier.qty || ''}
                                  onChange={e => {
                                    let newTiers = [...(editingItem.tiers || [])];
                                    newTiers[idx].qty = Number(e.target.value);
                                    setEditingItem({...editingItem, tiers: newTiers});
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <span className="text-stone-500 text-sm">總價 $</span>
                                <input
                                  type="number"
                                  placeholder="總價"
                                  className="w-24 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                                  value={tier.total_price || ''}
                                  onChange={e => {
                                    let newTiers = [...(editingItem.tiers || [])];
                                    newTiers[idx].total_price = Number(e.target.value);
                                    setEditingItem({...editingItem, tiers: newTiers});
                                  }}
                                />
                              </div>
                            </>
                          )}
                          
                          <button type="button" onClick={() => {
                             let newTiers = [...(editingItem.tiers || [])];
                             newTiers.splice(idx, 1);
                             setEditingItem({...editingItem, tiers: newTiers});
                          }} className="ml-auto p-2 text-stone-400 hover:text-red-500 transition-colors" title="刪除">
                             <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => {
                         let newTiers = [...(editingItem.tiers || [])];
                         if (editingItem.rule_type === 'volume') {
                           newTiers.push({ min_qty: 1, max_qty: null, unit_price: 0 });
                         } else {
                           newTiers.push({ qty: 1, total_price: 0 });
                         }
                         setEditingItem({...editingItem, tiers: newTiers});
                      }} className="text-sm text-rose-500 hover:text-rose-600 font-medium whitespace-nowrap">
                         + 新增級距
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-stone-50 border border-stone-100 rounded-xl">
                    <h4 className="text-sm font-medium text-stone-800 mb-3">獨立運費設定 (選填)</h4>
                    <p className="text-xs text-stone-500 mb-3">若設定此區塊，系統結帳時將以「數量計算出的箱數 x 每箱運費」來收取運費，並取代商品原先的獨立運費。</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          每箱入數限制
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editingItem.items_per_box || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              items_per_box: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          placeholder="例如: 100"
                          className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          單箱運費 ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingItem.shipping_fee_per_box || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              shipping_fee_per_box: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          placeholder="例如: 120"
                          className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      備註與活動說明 (例如: 贈送插畫、運費規則)
                    </label>
                    <textarea
                      rows={5}
                      value={editingItem.notes || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, notes: e.target.value })
                      }
                      placeholder="支援顯示於商品頁的活動說明"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                </>
              )}

              {(activeTab === "products" || activeTab === "posts") && (
                <div className="p-4 bg-stone-50 rounded-xl space-y-3">
                  <h4 className="text-sm font-medium text-stone-800">
                    SEO 設定
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      SEO 標題
                    </label>
                    <input
                      type="text"
                      value={editingItem.seo_title || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          seo_title: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="留白則使用預設標題"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      SEO 描述
                    </label>
                    <textarea
                      value={editingItem.seo_description || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          seo_description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none h-20"
                      placeholder="簡短描述，適合搜尋引擎抓取"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="p-6 border-t border-stone-100 flex gap-3">
            {activeTab === "orders" && editingItem.id && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/admin/website/orders/${editingItem.id}/transfer`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                      showAlert("成功", "已成功轉讓為管理訂單");
                      setEditingItem(null);
                      if (onDataChange) onDataChange();
                    } else {
                      showAlert("錯誤", data.error || "轉讓失敗");
                    }
                  } catch (e: any) {
                    showAlert("錯誤", e.message || "發生錯誤");
                  }
                }}
                className="px-4 py-2 border border-stone-300 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2 font-medium"
              >
                轉為內部管理訂單
              </button>
            )}
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              form="entity-form"
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              <Save className="w-4 h-4" />
              儲存
            </button>
          </div>
        </div>
      </div>
    );
  };

  let displayData = data;
  if (activeTab === "products" && selectedProductCategoryId !== 'all') {
    displayData = data.filter(item => item.category_id === selectedProductCategoryId);
  } else if (activeTab === "orders") {
    displayData = data.filter(item => {
      let matchMonth = true;
      if (orderMonthFilter !== 'all') {
         if (!item.created_at) matchMonth = false;
         else {
           const date = new Date(item.created_at + (item.created_at.includes('Z') ? '' : 'Z'));
           const monthFormat = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
           matchMonth = monthFormat === orderMonthFilter;
         }
      }
      let matchStatus = true;
      if (orderStatusFilter === 'unprocessed') {
         matchStatus = ['pending_payment', 'paid'].includes(item.status);
      } else if (orderStatusFilter === 'processed') {
         matchStatus = ['processing', 'shipped', 'completed', 'cancelled'].includes(item.status);
      }
      return matchMonth && matchStatus;
    });
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <div className="flex items-center bg-stone-100 p-1 rounded-lg">
          {(
            [
              "products",
              "categories",
              "collections",
              "addon_groups",
              "pricing_rules",
              "posts",
              "orders",
            ] as EntityType[]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
            >
              {tab === "products"
                ? "商品"
                : tab === "categories"
                  ? "分類"
                  : tab === "collections"
                    ? "系列"
                    : tab === "addon_groups"
                      ? "加購項目"
                      : tab === "pricing_rules"
                        ? "活動報價規則"
                        : tab === "posts"
                          ? "文章"
                          : "訂單"}
            </button>
          ))}
        </div>

        {activeTab === "products" && (
          <div className="flex-1 min-w-[200px] max-w-sm">
            <select
              value={selectedProductCategoryId}
              onChange={(e) => setSelectedProductCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 outline-none text-sm text-stone-600"
            >
              <option value="all">所有分類</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="flex-1 flex gap-3 min-w-[200px] max-w-md">
            <select
              value={orderMonthFilter}
              onChange={(e) => setOrderMonthFilter(e.target.value)}
              className="w-1/2 px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 outline-none text-sm text-stone-600"
            >
              <option value="all">所有月份</option>
              {Array.from(new Set(data.map(d => {
                 if (!d.created_at) return '';
                 const date = new Date(d.created_at + (d.created_at.includes('Z') ? '' : 'Z'));
                 return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              }))).filter(Boolean).sort((a,b) => b.localeCompare(a)).map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value as any)}
              className="w-1/2 px-3 py-2 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 outline-none text-sm text-stone-600"
            >
              <option value="all">所有狀態</option>
              <option value="unprocessed">待處理/已付款</option>
              <option value="processed">已處理 (含轉單/出貨等)</option>
            </select>
          </div>
        )}

        {activeTab !== "orders" && (
          <button
            onClick={() => {
              const initItem: any = {};
              if (activeTab === "products") {
                initItem.variant_items = [];
                initItem.inclusions = [];
                initItem.shipping_fee = 120;
                initItem.addon_group_ids = globalAddonGroups
                  .filter((g: any) => g.is_default_for_invitation)
                  .map((g: any) => g.id);
                initItem.product_type = "custom_invitation";
              } else if (activeTab === "pricing_rules") {
                initItem.rule_type = "volume";
                initItem.tiers = [];
              }
              setEditingItem(initItem);
            }}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-rose-200"
          >
            <Plus className="w-4 h-4" />
            新增
            {activeTab === "products"
              ? "商品"
              : activeTab === "categories"
                ? "分類"
                : activeTab === "collections"
                  ? "系列"
                  : activeTab === "addon_groups"
                    ? "加購項目"
                    : activeTab === "pricing_rules"
                      ? "報價規則"
                      : "文章"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-white border border-stone-100 shadow-sm rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-stone-50 border-b border-stone-100 sticky top-0">
            <tr>
              <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                ID
              </th>
              <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                {activeTab === "orders" ? "收件人" : "名稱"}
              </th>
              {activeTab === "orders" && (
                <>
                  <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                    帳號 (Email)
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                    建立時間
                  </th>
                </>
              )}
              {activeTab === "products" ? (
                <>
                  <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                    分類
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                    系列
                  </th>
                </>
              ) : (
                <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                  {activeTab === "orders" ? "總金額" : activeTab === "addon_groups" ? "類型" : activeTab === "pricing_rules" ? "類型" : "Slug"}
                </th>
              )}
              {(activeTab === "products" || activeTab === "collections") && (
                <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                  狀態
                </th>
              )}
              {activeTab === "orders" && (
                <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase">
                  狀態
                </th>
              )}
              <th className="py-3 px-4 text-xs font-medium text-stone-500 uppercase text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500">
                  載入中...
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500">
                  目前沒有資料
                </td>
              </tr>
            ) : (
              displayData.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-stone-50 hover:bg-stone-50/50"
                >
                  <td className="py-3 px-4 text-sm text-stone-500">
                    #{item.id}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-stone-800">
                    {activeTab === "orders"
                      ? (() => {
                          try {
                            const shippingInfo = item.shipping_info ? JSON.parse(item.shipping_info) : null;
                            const name = shippingInfo?.name || `用戶 ID: ${item.user_id || "訪客"}`;
                            return name;
                          } catch (e) {
                            return `用戶 ID: ${item.user_id || "訪客"}`;
                          }
                        })()
                      : item.title || item.name}
                  </td>
                  {activeTab === "orders" && (
                    <>
                      <td className="py-3 px-4 text-sm text-stone-500">
                        {item.user_email || "訪客"}
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-500">
                        {item.created_at ? new Date(item.created_at + (item.created_at.includes('Z') ? '' : 'Z')).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </>
                  )}
                  {activeTab === "products" ? (
                    <>
                      <td className="py-3 px-4 text-sm text-stone-500">
                        {categories.find((c: any) => c.id === item.category_id)
                          ?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-500">
                        {collections.find(
                          (c: any) => c.id === item.collection_id,
                        )?.title || "-"}
                      </td>
                    </>
                  ) : (
                    <td className="py-3 px-4 text-sm text-stone-500">
                      {activeTab === "orders"
                        ? `$${item.total_amount}`
                        : activeTab === "addon_groups"
                          ? (item.input_type === 'select' ? '下拉選單' : '多選框')
                          : activeTab === "pricing_rules"
                            ? (item.rule_type === 'volume' ? '數量階梯報價' : '組合總價報價')
                            : item.slug}
                    </td>
                  )}
                  {(activeTab === "products" || activeTab === "collections") && (
                    <td className="py-3 px-4 text-sm">
                      {item.is_active || item.is_active === undefined ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {activeTab === "collections" ? "顯示中" : "上架中"}
                        </span>
                      ) : (
                        <span className="text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {activeTab === "collections" ? "隱藏中" : "下架中"}
                        </span>
                      )}
                    </td>
                  )}
                  {activeTab === "orders" && (
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === "paid" ? "bg-green-100 text-green-700" :
                        ["processing", "shipped", "completed"].includes(item.status) ? "bg-blue-100 text-blue-700" :
                        "text-stone-600 bg-stone-100"
                      }`}>
                        {item.status === "pending_payment"
                          ? "待付款"
                          : item.status === "paid"
                            ? "已付款"
                            : item.status === "processing"
                              ? "處理中"
                              : item.status === "shipped"
                                ? "已出貨"
                                : item.status === "completed"
                                  ? "已完成"
                                  : item.status === "cancelled"
                                    ? "已取消"
                                    : item.status}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4 text-right">
                    {(activeTab === "products" || activeTab === "collections") && (
                      <>
                        <button
                          onClick={() => handleReorder('up', item.id, displayData)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors mr-1"
                          title="往上移"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReorder('down', item.id, displayData)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors mr-2"
                          title="往下移"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={async () => {
                        if (activeTab === "orders") {
                          try {
                            const res = await fetch(
                              `/api/admin/website/orders/${item.id}`,
                              { headers: { Authorization: `Bearer ${token}` } },
                            );
                            if (res.ok) setEditingItem(await res.json());
                          } catch (err) {
                            console.error(err);
                          }
                        } else {
                          let editItem = { ...item };
                          if (activeTab === "products") {
                            const vars = editItem.variants || {};
                            editItem.variant_items = Array.isArray(vars) ? vars : (vars.items || []);
                            editItem.addon_group_ids = Array.isArray(vars) ? [] : (vars.addon_group_ids || []);
                            editItem.addon_group_defaults = Array.isArray(vars) ? {} : (vars.addon_group_defaults || {});
                            editItem.inclusions = editItem.inclusions || [];
                          } else if (activeTab === "posts") {
                            if (typeof editItem.tags === 'string') {
                               try { editItem.tags = JSON.parse(editItem.tags) || []; } catch(e) { editItem.tags = []; }
                            } else if (!editItem.tags) {
                               editItem.tags = [];
                            }
                          }
                          setEditingItem(editItem);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors mr-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isEditingPresetInclusions && (
        <div className="fixed inset-0 z-[60] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-serif text-stone-800 mb-4">編輯常用包含項目</h3>
            <div className="flex flex-col gap-2 mb-4 max-h-[60vh] overflow-y-auto">
              {presetInclusions.map((p, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => {
                      const newP = [...presetInclusions];
                      newP[idx] = e.target.value;
                      setPresetInclusions(newP);
                    }}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <button onClick={() => {
                      const newP = [...presetInclusions];
                      newP.splice(idx, 1);
                      setPresetInclusions(newP);
                  }} className="p-2 text-stone-400 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setPresetInclusions([...presetInclusions, "新項目"])}
                className="text-sm text-rose-500 hover:text-rose-600 font-medium self-start mt-2"
              >
                + 新增項目
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={async () => {
                   await savePreset("preset_inclusions", presetInclusions);
                   setIsEditingPresetInclusions(false);
                }}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 font-medium transition-colors"
              >
                儲存關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingPresetVariants && (
        <div className="fixed inset-0 z-[60] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-serif text-stone-800 mb-4">編輯常用商品款式</h3>
            <div className="flex flex-col gap-3 mb-4 max-h-[60vh] overflow-y-auto">
              {presetVariants.map((p, idx) => (
                <div key={idx} className="flex flex-col gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={p.is_default || false}
                        onChange={(e) => {
                          const newP = [...presetVariants];
                          if (e.target.checked) {
                            newP.forEach(v => v.is_default = false);
                          }
                          newP[idx].is_default = e.target.checked;
                          setPresetVariants(newP);
                        }}
                        className="rounded border-stone-300 text-rose-500 focus:ring-rose-500 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-stone-600">預設</span>
                    </label>
                    <input
                      type="text"
                      placeholder="款式名稱"
                      value={p.name}
                      onChange={(e) => {
                        const newP = [...presetVariants];
                        newP[idx].name = e.target.value;
                        setPresetVariants(newP);
                      }}
                      className="flex-1 px-3 py-1.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="價格"
                      value={p.price}
                      onChange={(e) => {
                        const newP = [...presetVariants];
                        newP[idx].price = Number(e.target.value);
                        setPresetVariants(newP);
                      }}
                      className="w-24 px-3 py-1.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                    />
                    <button onClick={() => {
                        const newP = [...presetVariants];
                        if (idx > 0) {
                          [newP[idx - 1], newP[idx]] = [newP[idx], newP[idx - 1]];
                          setPresetVariants(newP);
                        }
                    }} className="p-2 text-stone-400 hover:text-stone-700 shrink-0 border-transparent" title="往上移">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                        const newP = [...presetVariants];
                        if (idx < newP.length - 1) {
                          [newP[idx + 1], newP[idx]] = [newP[idx], newP[idx + 1]];
                          setPresetVariants(newP);
                        }
                    }} className="p-2 text-stone-400 hover:text-stone-700 shrink-0 border-transparent" title="往下移">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                        const newP = [...presetVariants];
                        newP.splice(idx, 1);
                        setPresetVariants(newP);
                    }} className="p-2 text-stone-400 hover:text-red-500 shrink-0 border-transparent">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    placeholder="備註文字，如: 最經典的美式喜帖形式，簡潔俐落..."
                    value={p.description || ''}
                    onChange={(e) => {
                      const newP = [...presetVariants];
                      newP[idx].description = e.target.value;
                      setPresetVariants(newP);
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none h-12"
                  />
                  <div className="flex gap-4 items-center mt-1">
                    {p.image && (
                       <div className="flex gap-2">
                         <div className="relative group shrink-0">
                           <img src={p.image} alt={p.image_alt || p.name || `Variant ${idx}`} className="w-12 h-12 rounded object-cover border border-stone-200" />
                           <button type="button" onClick={() => {
                               let newP = [...presetVariants];
                               delete newP[idx].image;
                               delete newP[idx].image_alt;
                               setPresetVariants(newP);
                           }} className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <X className="w-3 h-3" />
                           </button>
                         </div>
                         <input
                            type="text"
                            placeholder="圖片替代文字 (Alt)"
                            className="px-2 py-1 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none h-8 my-auto"
                            value={p.image_alt || ""}
                            onChange={e => {
                               let newP = [...presetVariants];
                               newP[idx].image_alt = e.target.value;
                               setPresetVariants(newP);
                            }}
                         />
                       </div>
                    )}
                    <label className="cursor-pointer text-xs flex items-center gap-1 text-stone-500 hover:text-stone-700">
                       <ImageIcon className="w-4 h-4" />
                       {p.image ? '更換圖片' : '上傳選項圖片 (選填)'}
                       <input type="file" className="hidden" accept="image/*" onChange={e => handlePresetVariantImageUpload(e, idx)} disabled={isUploadingImage} />
                    </label>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setPresetVariants([...presetVariants, { name: "新款式", price: 0, description: "" }])}
                className="text-sm text-rose-500 hover:text-rose-600 font-medium self-start mt-2"
              >
                + 新增款式
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={async () => {
                   await savePreset("preset_variants", presetVariants);
                   setIsEditingPresetVariants(false);
                }}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 font-medium transition-colors"
              >
                儲存關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {renderForm()}
    </div>
  );
}
