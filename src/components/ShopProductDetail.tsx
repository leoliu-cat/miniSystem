import React, { useState, useEffect } from "react";
import {
  Copy,
  MapPin,
  Search,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  ShieldCheck,
  Mail,
  Lock,
  CheckCircle,
  Tag,
} from "lucide-react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface ProductType {
  id: number;
  title: string;
  slug: string;
  description: string;
  base_price: number;
  images: string[];
  image_alts?: string[];
  variants: any;
  category_id: number;
  is_wedding_invitation: boolean;
  min_qty: number;
  product_type: string;
  inclusions: string[];
  addon_groups?: any[];
  related?: any[];
  pricing_rule?: any;
}

export default function ShopProductDetail({
  productIdOrSlug,
}: {
  productIdOrSlug: string;
}) {
  const [product, setProduct] = useState<ProductType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedMainImage, setSelectedMainImage] = useState(0);

  // Invitation Addons
  const [selectedAddons, setSelectedAddons] = useState<any>({
    format: "",
    paper: "",
    envelopeFoil: "",
    envelopeColors: [] as string[],
    stickerStyle: "",
    stickerColor: "",
    illustration: "",
    petIllustration: "",
  });

  useEffect(() => {
    fetch(`/api/products/${productIdOrSlug}`)
      .then((r) => {
        const contentType = r.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          return r.json();
        } else {
          throw new Error("Invalid response from server");
        }
      })
      .then((data) => {
        setProduct(data);
        if (data && data.min_qty) {
          setQuantity(data.min_qty);
        }

        // Populate default addons
        if (data && data.addon_groups) {
          const newSelectedAddons: any = {};

          if (
            data.variants &&
            data.variants.items &&
            data.variants.items.length > 0
          ) {
            const defaultIdx = data.variants.items.findIndex(
              (v: any) => v.is_default,
            );
            if (defaultIdx >= 0) {
              newSelectedAddons.variant_idx = defaultIdx;
            }
          }

          data.addon_groups.forEach((group: any) => {
            const opts =
              typeof group.options === "string"
                ? JSON.parse(group.options || "[]")
                : group.options || [];
            
            // Check for product-specific default overrides
            const productOverrides = data.variants?.addon_group_defaults || {};
            const overrideVal = productOverrides[group.id];
            
            let defaults = opts.filter((o: any) => o.is_default);

            if (
              group.max_selections === 1 ||
              group.input_type === "image_picker" ||
              group.input_type === "select"
            ) {
              // For single selection, check override first
              if (overrideVal) {
                newSelectedAddons[`addon_${group.id}`] = overrideVal;
              } else if (defaults.length > 0) {
                newSelectedAddons[`addon_${group.id}`] = defaults[0].name;
              } else if (
                (group.input_type === "select" ||
                  group.input_type === "image_picker") &&
                opts.length > 0
              ) {
                // Even if no default is explicitly checked, select might default to the first
                newSelectedAddons[`addon_${group.id}`] = opts[0].name;
              }
            } else {
              // For multi-selection
              if (overrideVal !== undefined) {
                newSelectedAddons[`addon_${group.id}`] = Array.isArray(overrideVal) ? overrideVal : [];
              } else if (defaults.length > 0) {
                newSelectedAddons[`addon_${group.id}`] = defaults.map(
                  (d: any) => d.name,
                );
              } else {
                newSelectedAddons[`addon_${group.id}`] = [];
              }
            }
          });

          // Merge with any existing default state
          setSelectedAddons((prev: any) => ({ ...prev, ...newSelectedAddons }));
        }

        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  }, [productIdOrSlug]);

  if (isLoading)
    return <div className="p-20 text-center text-stone-500">載入中...</div>;
  if (!product)
    return (
      <div className="p-20 text-center text-stone-500">找不到此商品內容</div>
    );

  const isWeddingInvitation =
    product.is_wedding_invitation ||
    product.product_type === "custom_invitation";

  const handleQuantity = (dir: number) => {
    setQuantity(Math.max(product.min_qty || 1, quantity + dir));
  };

  const handleCheckboxArray = (key: string, val: string, max: number) => {
    const list = selectedAddons[key as keyof typeof selectedAddons] as string[];
    if (list.includes(val)) {
      setSelectedAddons({
        ...selectedAddons,
        [key]: list.filter((i) => i !== val),
      });
    } else {
      if (list.length < max) {
        setSelectedAddons({ ...selectedAddons, [key]: [...list, val] });
      } else {
        // remove first and add new
        setSelectedAddons({
          ...selectedAddons,
          [key]: [...list.slice(1), val],
        });
      }
    }
  };

  let totalPrice = product.base_price;

  if (product.variants?.items?.length > 0) {
    const vIdx = selectedAddons.variant_idx || 0;
    if (product.variants.items[vIdx]) {
      totalPrice = Number(product.variants.items[vIdx].price) || 0;
    }
  }

  // Apply Pricing Rule if available
  let activeTierNote = "";
  if (product.pricing_rule) {
    const r = product.pricing_rule;
    if (r.rule_type === "volume") {
      // Find matching tier
      const tier = r.tiers.find((t: any) => quantity >= t.min_qty && (!t.max_qty || quantity <= t.max_qty));
      if (tier && tier.unit_price !== undefined) {
        totalPrice = tier.unit_price;
      }
    } else if (r.rule_type === "bundle") {
      const tier = r.tiers.find((t: any) => t.qty === quantity);
      if (tier && tier.total_price !== undefined) {
        totalPrice = tier.total_price / quantity;
      }
    }
  }

  let totalAddonPrice = 0;
  if (product.addon_groups) {
    product.addon_groups.forEach((group: any) => {
      let selected = selectedAddons[`addon_${group.id}`];
      if (
        !selected &&
        (group.input_type === "select" ||
          group.input_type === "image_picker") &&
        group.options.length > 0
      ) {
        selected = group.options[0].name;
      }
      if (!selected) return;
      const opts = Array.isArray(selected) ? selected : [selected];
      opts.forEach((optName: string) => {
        const match = group.options.find((o: any) => o.name === optName);
        if (match && match.price) {
          if (match.price_type === "per_item")
            totalAddonPrice += match.price * quantity;
          else if (match.price_type === "min_100_per_item")
            totalAddonPrice += match.price * Math.max(100, quantity);
          else totalAddonPrice += match.price; // flat fee
        }
      });
    });
  }

  let computedShippingFee = product.shipping_fee !== undefined && product.shipping_fee !== null ? product.shipping_fee : 120;
  if (product.pricing_rule && product.pricing_rule.items_per_box && product.pricing_rule.shipping_fee_per_box != null) {
      const boxes = Math.ceil(quantity / product.pricing_rule.items_per_box);
      computedShippingFee = boxes * product.pricing_rule.shipping_fee_per_box;
  }

  const finalTotal = totalPrice * quantity + totalAddonPrice + computedShippingFee;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans text-stone-800">
      {/* Breadcrumb */}
      <div className="flex items-center text-xs text-stone-500 mb-8 space-x-2">
        <span className="hover:text-stone-800 cursor-pointer">首頁</span>
        <ChevronRight className="w-3 h-3" />
        <span className="hover:text-stone-800 cursor-pointer">
          {isWeddingInvitation ? "喜帖" : "商品"}
        </span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-stone-800">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Images */}
        <div className="lg:col-span-6 flex gap-4">
          <div className="flex flex-col gap-3 w-20">
            {product.images?.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={
                  (product.image_alts || [])[idx] ||
                  `${product.title} 縮圖 ${idx + 1}`
                }
                className={`w-20 h-24 object-cover cursor-pointer hover:opacity-80 transition-opacity border ${selectedMainImage === idx ? "border-amber-700" : "border-transparent"}`}
                onClick={() => setSelectedMainImage(idx)}
              />
            ))}
          </div>
          <div className="flex-1 bg-stone-50 aspect-[4/5] overflow-hidden">
            {product.images?.length > 0 ? (
              <img
                src={product.images[selectedMainImage]}
                alt={
                  (product.image_alts || [])[selectedMainImage] || product.title
                }
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                尚無圖片
              </div>
            )}
          </div>
        </div>

        {/* Right: Info & Options */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs text-stone-500 border border-stone-300 px-2 py-1 mb-3 inline-block">
                {isWeddingInvitation ? "婚卡" : "單品"}
              </span>
              <h1 className="text-3xl font-serif tracking-wide text-stone-900">
                {product.title}
              </h1>
            </div>
            <button className="text-stone-400 hover:text-rose-500">
              <Heart className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-baseline gap-2 mb-6 border-b border-stone-200 pb-6">
            <span className="text-sm text-stone-500">NT$</span>
            <span className="text-2xl font-serif">
              {totalPrice.toLocaleString()}
            </span>
            <span className="text-sm text-stone-500">
              / {isWeddingInvitation ? "套" : "個"}
            </span>
          </div>

          {product.description && (
            <div className="mb-8 markdown-body">
              <Markdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                {product.description}
              </Markdown>
            </div>
          )}

          {/* Pricing Rules Visualizer */}
          {product.pricing_rule && product.pricing_rule.tiers && (
            <div className="mb-8 p-4 bg-[#F8F5F1] rounded-lg">
              <div className="flex items-center gap-2 mb-3 text-stone-800">
                <Tag className="w-4 h-4 text-amber-700" />
                <h4 className="font-medium text-sm">
                  {product.pricing_rule.rule_type === 'volume' ? '數量折扣區間' : '套裝組合優惠'}
                </h4>
              </div>
              <ul className="space-y-1.5 text-sm text-stone-600 mb-3">
                {product.pricing_rule.tiers.map((tier: any, i: number) => {
                   if (product.pricing_rule.rule_type === 'volume') {
                     const isLast = !tier.max_qty;
                     return (
                       <li key={i} className="flex justify-between border-b border-white/50 pb-1.5">
                         <span>
                           {isLast ? `${tier.min_qty} 個以上` : `${tier.min_qty} ~ ${tier.max_qty} 個`}
                         </span>
                         <span className="font-medium text-amber-800">NT$ {tier.unit_price} / 個</span>
                       </li>
                     );
                   } else {
                     return (
                       <li key={i} className="flex justify-between border-b border-white/50 pb-1.5">
                         <span>任選 {tier.qty} 個</span>
                         <span className="font-medium text-amber-800">優惠價 NT$ {tier.total_price}</span>
                       </li>
                     );
                   }
                })}
              </ul>
              {product.pricing_rule.notes && (
                <div className="text-xs text-stone-500 whitespace-pre-wrap leading-relaxed">
                  {product.pricing_rule.notes}
                </div>
              )}
            </div>
          )}

          {Array.isArray(product.inclusions) &&
            product.inclusions.length > 0 && (
              <div className="mb-8 p-5 bg-[#fcfbf9] border border-stone-100/80 rounded-xl">
                <h3 className="text-sm font-medium text-stone-900 mb-3 tracking-wide">
                  本商品 / 套餐皆包含以下內容：
                </h3>
                <ul className="space-y-2">
                  {product.inclusions.map((inc: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-start text-sm text-stone-600"
                    >
                      <span className="text-rose-400 mr-2 flex-shrink-0">
                        ✓
                      </span>
                      <span className="leading-relaxed">{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Variants Select */}
          {product.variants?.items?.length > 0 && (
            <div className="mb-8">
              <label className="block text-base font-serif text-stone-800 mb-3">
                商品款式
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {product.variants.items.map((vt: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() =>
                      setSelectedAddons({ ...selectedAddons, variant_idx: idx })
                    }
                    className={`relative flex flex-col p-4 rounded-xl border text-left transition-all ${
                      (selectedAddons.variant_idx || 0) === idx
                        ? "border-rose-300 ring-1 ring-rose-200 bg-rose-50/30"
                        : "border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50"
                    }`}
                  >
                    {(selectedAddons.variant_idx || 0) === idx && (
                      <div className="absolute -top-2 -left-2 bg-rose-400 text-white rounded-full p-1 border-2 border-white shadow-sm z-10">
                        <CheckCircle className="w-3 h-3" />
                      </div>
                    )}

                    {vt.image && (
                      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-3 bg-stone-100">
                        <img
                          src={vt.image}
                          alt={vt.image_alt || vt.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="font-serif text-stone-800 text-lg mb-1 mt-auto">
                      {vt.name}
                    </div>

                    {vt.description && (
                      <div className="text-xs text-stone-500 leading-relaxed mb-3 flex-1 markdown-body">
                        <Markdown
                          rehypePlugins={[rehypeRaw]}
                          remarkPlugins={[remarkGfm]}
                        >
                          {vt.description}
                        </Markdown>
                      </div>
                    )}

                    <div className="mt-auto pt-2 border-t border-stone-100 flex items-end gap-1">
                      <span className="text-rose-500 font-medium">
                        NT$ {vt.price}
                      </span>
                      <span className="text-xs text-stone-400 mb-0.5">
                        / 份
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic ADD-ONS SECTION */}
          {product.addon_groups && product.addon_groups.length > 0 && (
            <div className="space-y-6 mb-8">
              {Object.entries(
                (product.addon_groups || []).reduce((acc: any, group: any) => {
                  const dg = group.display_group || "加購選項";
                  if (!acc[dg]) acc[dg] = [];
                  acc[dg].push(group);
                  return acc;
                }, {}),
              ).map(([displayGroup, groups]: [string, any], idx) => (
                <div
                  key={idx}
                  className="p-6 bg-stone-50/50 rounded-2xl border border-stone-100"
                >
                  <h3 className="text-sm font-medium text-stone-900 mb-5 tracking-wide border-b border-stone-200/60 pb-3">
                    {displayGroup}
                  </h3>
                  <div className="space-y-6">
                    {groups.map((group: any) => (
                      <div key={group.id}>
                        <label className="block text-sm font-medium text-stone-800 mb-2">
                          {group.title}
                          {group.max_selections > 0 && (
                            <span className="text-stone-400 font-normal ml-2 text-xs">
                              (最多選 {group.max_selections} 色/項)
                            </span>
                          )}
                        </label>
                        {group.input_type === "select" ? (
                          <select
                            className="w-full text-sm border-stone-300 rounded-xl p-3 focus:ring-1 focus:ring-stone-400 focus:border-stone-400 outline-none transition-shadow bg-white"
                            value={
                              selectedAddons[`addon_${group.id}`] ||
                              group.options[0]?.name ||
                              ""
                            }
                            onChange={(e) =>
                              setSelectedAddons({
                                ...selectedAddons,
                                [`addon_${group.id}`]: e.target.value,
                              })
                            }
                          >
                            {group.options.map((opt: any, optIdx: number) => (
                              <option key={optIdx} value={opt.name}>
                                {opt.name}{" "}
                                {opt.price > 0
                                  ? `(+NT$ ${opt.price}${opt.price_type === "per_item" ? "/份" : opt.price_type === "min_100_per_item" ? "/份(最少100份)" : ""})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        ) : group.input_type === "image_picker" ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {group.options.map((opt: any, optIdx: number) => {
                              const selectedVal =
                                selectedAddons[`addon_${group.id}`];
                              const isChecked =
                                selectedVal === opt.name ||
                                (!selectedVal && optIdx === 0);
                              const hasImage = !!opt.image;

                              const handleSelect = () => {
                                setSelectedAddons({
                                  ...selectedAddons,
                                  [`addon_${group.id}`]: opt.name,
                                });
                              };

                              return (
                                <button
                                  type="button"
                                  key={optIdx}
                                  onClick={handleSelect}
                                  className="cursor-pointer group flex flex-col items-center gap-2 relative text-left outline-none"
                                >
                                  <div
                                    className={`w-full aspect-square overflow-hidden rounded-xl border-2 transition-all ${isChecked ? "border-rose-400 ring-4 ring-rose-50 scale-[0.98]" : "border-transparent bg-stone-100 hover:border-stone-200 shadow-sm"} relative`}
                                  >
                                    {hasImage ? (
                                      <img
                                        src={opt.image}
                                        className="w-full h-full object-cover"
                                        alt={opt.name}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs text-center border border-stone-200 rounded-xl bg-white">
                                        無圖片
                                        <br />
                                        {opt.name}
                                      </div>
                                    )}
                                    {isChecked && (
                                      <div className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full shadow-sm">
                                        <CheckCircle className="w-3 h-3" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-center w-full">
                                    <span
                                      className={`block text-sm font-medium ${isChecked ? "text-stone-900" : "text-stone-600 group-hover:text-stone-800"}`}
                                    >
                                      {opt.name}
                                    </span>
                                    {opt.price > 0 && (
                                      <span className="text-[11px] text-stone-500">
                                        +NT$ {opt.price}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            className={
                              group.options.some((opt: any) => opt.image)
                                ? "grid grid-cols-2 sm:grid-cols-4 gap-4"
                                : "flex flex-wrap gap-2"
                            }
                          >
                            {group.options.map((opt: any, optIdx: number) => {
                              const checkedList =
                                selectedAddons[`addon_${group.id}`] || [];
                              const isChecked =
                                Array.isArray(checkedList) &&
                                checkedList.includes(opt.name);
                              const hasImage = !!opt.image;

                              const handleChange = (e: any) => {
                                let list = [...checkedList];
                                if (e.target.checked) list.push(opt.name);
                                else
                                  list = list.filter(
                                    (n: string) => n !== opt.name,
                                  );

                                if (
                                  group.max_selections > 0 &&
                                  list.length > group.max_selections
                                ) {
                                  list.shift(); // Remove the oldest choice to limit to max
                                }
                                setSelectedAddons({
                                  ...selectedAddons,
                                  [`addon_${group.id}`]: list,
                                });
                              };

                              if (group.options.some((o: any) => o.image)) {
                                // Render as Image Card
                                return (
                                  <label
                                    key={optIdx}
                                    className="cursor-pointer group flex flex-col items-center gap-2 relative"
                                  >
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={isChecked}
                                      onChange={handleChange}
                                    />
                                    <div
                                      className={`w-full aspect-square overflow-hidden rounded-xl border-2 transition-all ${isChecked ? "border-stone-800 scale-[0.98]" : "border-transparent bg-stone-100 hover:border-stone-200"} relative`}
                                    >
                                      {hasImage ? (
                                        <img
                                          src={opt.image}
                                          className="w-full h-full object-cover"
                                          alt={opt.name}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs text-center border border-stone-200 rounded-xl bg-white">
                                          無圖片
                                          <br />
                                          {opt.name}
                                        </div>
                                      )}
                                      {isChecked && (
                                        <div className="absolute inset-0 bg-stone-900/5"></div>
                                      )}
                                    </div>
                                    <div className="text-center">
                                      <span
                                        className={`block text-sm font-medium ${isChecked ? "text-stone-900" : "text-stone-600 group-hover:text-stone-800"}`}
                                      >
                                        {opt.name}
                                      </span>
                                      {opt.price > 0 && (
                                        <span className="text-[11px] text-stone-500">
                                          +NT$ {opt.price}
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                );
                              } else {
                                // Render as Tag Button
                                return (
                                  <label
                                    key={optIdx}
                                    className={`cursor-pointer inline-flex items-center justify-center px-4 py-2 border rounded-lg text-sm transition-all focus:outline-none ${isChecked ? "border-stone-800 bg-stone-800 text-white font-medium shadow-sm" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={isChecked}
                                      onChange={handleChange}
                                    />
                                    {opt.name}
                                    {opt.price > 0 && (
                                      <span
                                        className={`ml-1 text-[11px] ${isChecked ? "text-stone-300" : "text-stone-400"}`}
                                      >
                                        (+NT$ {opt.price})
                                      </span>
                                    )}
                                  </label>
                                );
                              }
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity & Dates */}
          <div className="flex items-center gap-6 mb-8 border-t border-stone-200 pt-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-stone-800 mb-2">
                數量
              </label>
              <div className="flex items-center border border-stone-300 rounded w-fit overflow-hidden">
                <button
                  onClick={() => handleQuantity(-1)}
                  className="px-3 py-2 text-stone-500 hover:bg-stone-100 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(
                        product.min_qty || 1,
                        Number(e.target.value) || 1,
                      ),
                    )
                  }
                  className="w-16 text-center text-sm py-2 outline-none"
                  min={product.min_qty || 1}
                />
                <button
                  onClick={() => handleQuantity(1)}
                  className="px-3 py-2 text-stone-500 hover:bg-stone-100 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {isWeddingInvitation && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-stone-800 mb-2">
                  預計婚期 / 活動日期
                </label>
                <input
                  type="date"
                  className="w-full text-sm border-stone-300 rounded p-2.5 outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400"
                />
              </div>
            )}
          </div>

          {/* Add to Cart Sticky Box logic */}
          <div className="bg-white sticky bottom-0 border-t lg:border-none pt-4 lg:pt-0 mt-auto flex flex-col">
            {computedShippingFee > 0 && (
              <div className="flex justify-between items-center mb-2 text-sm text-stone-500">
                <span>運費</span>
                <span>NT$ {computedShippingFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <span className="text-stone-700 font-medium">總金額</span>
              <span className="text-2xl font-serif text-stone-900 border-b border-transparent">
                NT$ {finalTotal.toLocaleString()}
              </span>
            </div>

            <button onClick={() => {
              const mockCart = {
                total: finalTotal,
                items: [{
                  product_id: product.id,
                  quantity: quantity,
                  price: totalPrice,
                  options: selectedAddons,
                  shipping_fee: computedShippingFee
                }]
              };
              localStorage.setItem('website_cart', JSON.stringify(mockCart));
              window.location.href = "/checkout";
            }} className="w-full bg-stone-800 text-white font-medium py-4 text-sm flex items-center justify-center gap-2 hover:bg-stone-900 transition-colors shadow-lg">
              <ShoppingCart className="w-4 h-4" /> 加入購物車 / 直接結帳
            </button>
            <button className="w-full mt-3 bg-white text-stone-800 border border-stone-300 font-medium py-3 text-sm flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors">
              <Heart className="w-4 h-4" /> 加入我的收藏
            </button>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 border-t border-stone-200 pt-16">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4 text-stone-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="font-medium text-stone-900 mb-2">安心製作</h4>
          <p className="text-sm text-stone-500 leading-relaxed">
            每一份設計，我們都用心對待。反覆確認與校對，確保拿到您手上是最完美的模樣。
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4 text-stone-600">
            <Mail className="w-6 h-6" />
          </div>
          <h4 className="font-medium text-stone-900 mb-2">專屬服務</h4>
          <p className="text-sm text-stone-500 leading-relaxed">
            從選擇款式到加購細節，官方 Line
            隨時為您解惑，打造最符合您期待的專屬設計。
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4 text-stone-600">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="font-medium text-stone-900 mb-2">安全結帳</h4>
          <p className="text-sm text-stone-500 leading-relaxed">
            我們提供安全加密的購物車結帳流程，保障您的資訊隱私與交易安全。
          </p>
        </div>
      </div>
    </div>
  );
}
