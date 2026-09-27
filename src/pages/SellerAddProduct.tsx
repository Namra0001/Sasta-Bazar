import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ArrowLeft, Loader2, Image as ImageIcon, FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SellerAddProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState("");

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    gender: "",
    brand: "",
    productCode: "",
    sizes: [] as string[],
    colors: [] as string[],
    stock: "",
    specifications: {} as { [key: string]: string },
    tags: [] as string[]
  });

  const categories = ["shirts", "jeans", "dresses", "jackets", "blazers", "skirts", "accessories"];
  const genderOptions = ["men", "women", "unisex"];
  const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const colorOptions = ["Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Gray", "Brown"];

  useEffect(() => {
    checkSellerRole();
  }, []);

  const checkSellerRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/seller/auth');
        return;
      }
      
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "seller")
        .limit(1)
        .maybeSingle();

      if (roleError) {
        if (user.email !== 'namradabhi0001@gmail.com') {
          navigate("/seller/auth");
          return;
        }
      } else if (!roleData && user.email !== 'namradabhi0001@gmail.com') {
        navigate("/seller/auth");
        return;
      }
    } catch (error) {
      console.error('Error checking seller role:', error);
      navigate('/seller/auth');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const toggleSize = (size: string) => {
    setNewProduct(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
    }));
  };

  const toggleColor = (color: string) => {
    setNewProduct(prev => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter(c => c !== color) : [...prev.colors, color]
    }));
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category || !newProduct.productCode) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (imageFiles.length > 4) {
      toast({
        title: "Error",
        description: "Maximum 4 images allowed",
        variant: "destructive"
      });
      return;
    }

    try {
      let imageUrl = "";
      let imageUrls: string[] = [];
      let videoUrls: string[] = [];
      setUploadingMedia(true);

      for (const imageFile of imageFiles.slice(0, 4)) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        imageUrls.push(publicUrl);
        if (!imageUrl) imageUrl = publicUrl;
      }

      for (const videoFile of videoFiles) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, videoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        videoUrls.push(publicUrl);
      }
      setUploadingMedia(false);

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("products").insert({
        name: newProduct.name,
        description: newProduct.description,
        price: parseInt(newProduct.price),
        original_price: newProduct.originalPrice ? parseInt(newProduct.originalPrice) : null,
        category: newProduct.category,
        gender: newProduct.gender,
        brand: newProduct.brand,
        sizes: newProduct.sizes,
        colors: newProduct.colors,
        stock: parseInt(newProduct.stock) || 0,
        image_url: imageUrl,
        image_urls: imageUrls,
        video_urls: videoUrls,
        product_code: newProduct.productCode,
        specifications: newProduct.specifications,
        tags: newProduct.tags,
        is_active: true,
        rating: 0,
        review_count: 0,
        sold_count: 0,
        seller_id: user?.id
      });
      
      if (error) throw error;
      
      toast({
        title: "Product Added!",
        description: "Your product has been successfully listed"
      });
      navigate('/seller');
    } catch (error: any) {
      console.error("Error adding product:", error);
      setUploadingMedia(false);
      toast({
        title: "Error",
        description: error?.message || JSON.stringify(error) || "Failed to add product",
        variant: "destructive"
      });
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products");

    worksheet.columns = [
      { header: "Name*", key: "name", width: 25 },
      { header: "Brand", key: "brand", width: 15 },
      { header: "Product Code (SKU)", key: "productCode", width: 20 },
      { header: "Description", key: "description", width: 35 },
      { header: "Price*", key: "price", width: 10 },
      { header: "Original Price", key: "originalPrice", width: 15 },
      { header: "Stock Quantity", key: "stock", width: 15 },
      { header: "Category*", key: "category", width: 15 },
      { header: "Gender", key: "gender", width: 15 },
      { header: "Sizes", key: "sizes", width: 20 },
      { header: "Colors", key: "colors", width: 20 },
      { header: "Image 1 URL", key: "image1", width: 30 },
      { header: "Image 2 URL", key: "image2", width: 30 },
      { header: "Image 3 URL", key: "image3", width: 30 },
      { header: "Image 4 URL", key: "image4", width: 30 },
      { header: "Video URL", key: "video", width: 30 }
    ];

    worksheet.addRow({
      name: "Sample T-Shirt",
      brand: "SastaBrand",
      productCode: "TS-001",
      description: "A nice t-shirt",
      price: 499,
      originalPrice: 999,
      stock: 50,
      category: "shirts",
      gender: "unisex",
      sizes: "S,M,L",
      colors: "Black,White",
      image1: "https://example.com/image1.jpg",
      image2: "",
      image3: "",
      image4: "",
      video: ""
    });

    // Add data validation for the first 500 rows
    for (let i = 2; i <= 500; i++) {
      worksheet.getCell(`H${i}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"shirts,jeans,dresses,jackets,blazers,skirts,accessories"']
      };
      worksheet.getCell(`I${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"men,women,unisex"']
      };
      worksheet.getCell(`J${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"XS,S,M,L,XL,XXL,XXXL"']
      };
      worksheet.getCell(`K${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Black,White,Red,Blue,Green,Yellow,Pink,Purple,Gray,Brown"']
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "bulk_upload_template.xlsx");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBulk(true);
    setBulkUploadProgress("Parsing file...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("Excel file is empty");
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        setBulkUploadProgress(`Found ${json.length} products. Uploading...`);
        
        const productsToInsert = json.map((row) => {
          const imageUrls = [row["Image 1 URL"], row["Image 2 URL"], row["Image 3 URL"], row["Image 4 URL"]].filter(Boolean);
          const videoUrls = row["Video URL"] ? [row["Video URL"]] : [];
          
          return {
            name: row["Name*"] || row.name || "",
            brand: row["Brand"] || row.brand || "",
            product_code: row["Product Code (SKU)"] || row.productCode || row.product_code || `BULK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            description: row["Description"] || row.description || "",
            price: parseInt(row["Price*"] || row.price) || 0,
            original_price: parseInt(row["Original Price"] || row.originalPrice || row.original_price) || null,
            stock: parseInt(row["Stock Quantity"] || row.stock) || 0,
            category: (row["Category*"] || row.category || "shirts").toLowerCase(),
            gender: (row["Gender"] || row.gender || "unisex").toLowerCase(),
            sizes: row["Sizes"] || row.sizes ? String(row["Sizes"] || row.sizes).split(",").map(s => s.trim()) : [],
            colors: row["Colors"] || row.colors ? String(row["Colors"] || row.colors).split(",").map(s => s.trim()) : [],
            image_url: imageUrls[0] || "",
            image_urls: imageUrls,
            video_urls: videoUrls,
            specifications: {},
            tags: [],
            is_active: true,
            rating: 0,
            review_count: 0,
            sold_count: 0,
            seller_id: user.id
          };
        });

        const { error } = await supabase.from("products").insert(productsToInsert);
        
        if (error) throw error;

        toast({
          title: "Bulk Upload Successful",
          description: `Successfully added ${productsToInsert.length} products.`
        });
        
        navigate("/seller");

      } catch (error: any) {
        console.error("Bulk upload error:", error);
        toast({
          title: "Bulk Upload Failed",
          description: error?.message || "An error occurred during bulk upload",
          variant: "destructive"
        });
      } finally {
        setIsUploadingBulk(false);
        setBulkUploadProgress("");
        if (e.target) e.target.value = "";
      }
    };
    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "Could not read the uploaded file",
        variant: "destructive"
      });
      setIsUploadingBulk(false);
      setBulkUploadProgress("");
    };
    reader.readAsArrayBuffer(file);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying seller access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/seller")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Add New Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="single">Single Product</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Listing (Excel)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Enter product name" className="bg-secondary border-border" />
              </div>
              
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" value={newProduct.brand} onChange={e => setNewProduct({ ...newProduct, brand: e.target.value })} placeholder="Enter brand name" className="bg-secondary border-border" />
              </div>
            </div>

            <div>
              <Label htmlFor="product-code">Product Code (SKU) *</Label>
              <Input id="product-code" value={newProduct.productCode} onChange={e => setNewProduct({ ...newProduct, productCode: e.target.value })} placeholder="e.g. SL-001" className="bg-secondary border-border" />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Detailed product description..." className="bg-secondary border-border min-h-[100px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="price">Price (₹) *</Label>
                <Input id="price" type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="0" className="bg-secondary border-border" />
              </div>
              
              <div>
                <Label htmlFor="originalPrice">Original Price (₹)</Label>
                <Input id="originalPrice" type="number" value={newProduct.originalPrice} onChange={e => setNewProduct({ ...newProduct, originalPrice: e.target.value })} placeholder="Optional" className="bg-secondary border-border" />
              </div>

              <div>
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input id="stock" type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} placeholder="0" className="bg-secondary border-border" />
              </div>

              <div>
                <Label>Category *</Label>
                <Select value={newProduct.category} onValueChange={val => setNewProduct({ ...newProduct, category: val })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6">
              <div className="space-y-4">
                <Label>Available Sizes</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sizeOptions.map(size => (
                    <Button 
                      key={size} 
                      type="button"
                      variant={newProduct.sizes.includes(size) ? "neon" : "outline"} 
                      size="sm"
                      onClick={() => toggleSize(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label>Available Colors</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {colorOptions.map(color => (
                    <Button 
                      key={color} 
                      type="button"
                      variant={newProduct.colors.includes(color) ? "neon" : "outline"} 
                      size="sm"
                      onClick={() => toggleColor(color)}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6">
              <div className="space-y-4">
                <Label>Product Images (Max 4)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-secondary/50 transition-colors">
                  <Input type="file" accept="image/*" multiple onChange={e => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files);
                      if (files.length > 4) {
                        toast({ title: "Error", description: "Maximum 4 images allowed", variant: "destructive" });
                        setImageFiles(files.slice(0, 4));
                      } else {
                        setImageFiles(files);
                      }
                    }
                  }} className="hidden" id="image-upload" />
                  <Label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <span className="font-medium text-foreground">Click to upload images</span>
                    <span className="text-sm mt-1">Select up to 4 images</span>
                  </Label>
                </div>
                {imageFiles.length > 0 && (
                  <div className="mt-2 p-4 border border-border rounded-lg bg-secondary/20">
                    <p className="text-sm font-medium mb-3">Selected Files (Choose Main Image):</p>
                    <div className="space-y-2">
                      {imageFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name="mainImageAdd" 
                            checked={i === 0} 
                            onChange={() => {
                              if (i !== 0) {
                                const newFiles = [...imageFiles];
                                const temp = newFiles[0];
                                newFiles[0] = newFiles[i];
                                newFiles[i] = temp;
                                setImageFiles(newFiles);
                              }
                            }} 
                            className="cursor-pointer"
                          />
                          <span className="text-sm">{f.name} {i === 0 && <span className="text-primary font-bold ml-2">(Main)</span>}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Product Videos (Optional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-secondary/50 transition-colors">
                  <Input type="file" accept="video/*" multiple onChange={e => {
                    if (e.target.files) {
                      setVideoFiles(Array.from(e.target.files));
                    }
                  }} className="hidden" id="video-upload" />
                  <Label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center justify-center text-muted-foreground">
                    <Upload className="h-10 w-10 mb-2" />
                    <span className="font-medium text-foreground">Click to upload videos</span>
                    {videoFiles.length > 0 && (
                      <span className="mt-2 text-primary font-medium">{videoFiles.length} files selected</span>
                    )}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-border">
              <Button variant="outline" onClick={() => navigate('/seller')} disabled={uploadingMedia}>
                Cancel
              </Button>
              <Button onClick={handleAddProduct} disabled={uploadingMedia} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]">
                {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Product"}
              </Button>
                </div>
              </TabsContent>

              <TabsContent value="bulk">
                <div className="flex flex-col items-center justify-center space-y-6 py-12">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Bulk Upload Products</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Upload an Excel file (.xlsx) to quickly add multiple products at once. You can now use the dropdowns in the template for Category, Gender, Sizes, and Colors, and add up to 4 image URLs and 1 video URL!
                      </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <Button 
                      variant="outline" 
                      onClick={downloadTemplate}
                      className="flex-1"
                      disabled={isUploadingBulk}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    
                    <div className="relative flex-1">
                      <Input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={handleBulkUpload} 
                        className="hidden" 
                        id="bulk-upload" 
                        disabled={isUploadingBulk}
                      />
                      <Button 
                        asChild
                        className="w-full bg-gradient-primary hover:shadow-glow-primary cursor-pointer"
                        disabled={isUploadingBulk}
                      >
                        <Label htmlFor="bulk-upload" className="cursor-pointer flex items-center justify-center">
                          {isUploadingBulk ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                          )}
                          {isUploadingBulk ? "Uploading..." : "Upload Excel"}
                        </Label>
                      </Button>
                    </div>
                  </div>
                  
                  {bulkUploadProgress && (
                    <p className="text-sm text-primary font-medium animate-pulse">
                      {bulkUploadProgress}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
