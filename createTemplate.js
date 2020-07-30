const fs = require("fs");
const crypto = require("crypto");
const FormData = require("form-data");
const {
  addHr,
  addRow,
  customerDetailsAnnotationId,
  calculateTableDimensions,
  createTextAnnotation,
  documentId,
  getPageDimensions,
  http,
  invoiceNumberAnnotationId,
  layout,
  templateLayerName,
} = require("./common");

const createDocument = () => {
  const form = new FormData();
  form.append("document_id", documentId);
  form.append("title", "invoice");
  form.append("file", fs.createReadStream("blank.pdf"));

  return http.post(`/documents`, form, {
    headers: form.getHeaders(),
  });
};

const createTemplateLayer = () =>
  http.post(`/documents/${documentId}/layers`, { name: templateLayerName });

const fileHash = (path) =>
  new Promise((resolve, reject) => {
    let hash = crypto.createHash("sha256");
    let fileHandle = fs.createReadStream(path);

    fileHandle.on("data", (d) => hash.update(d));
    fileHandle.on("end", () => {
      const digest = hash.digest("hex");
      resolve(digest);
    });
    fileHandle.on("error", reject);
  });

const addLogo = async () => {
  const logoPath = "./logo.pdf";
  const logoHash = await fileHash(logoPath);

  const imageAnnotation = {
    id: "logo-annotation",
    content: {
      v: 1,
      type: "pspdfkit/image",
      pageIndex: 0,
      bbox: [layout.margin, layout.margin, 130, 130],
      opacity: 1,
      imageAttachmentId: logoHash,
      contentType: "application/pdf",
    },
  };

  const form = new FormData();
  form.append("annotation", JSON.stringify(imageAnnotation));
  form.append(logoHash, fs.createReadStream(logoPath));
  return http.post(
    `/documents/${documentId}/layers/${templateLayerName}/annotations`,
    form,
    { headers: form.getHeaders() }
  );
};

const addCompanyDetails = () => {
  const text = "ACME Inc.\n1764 Reppert Coal Road\nDetroit, MI, 48226";
  const textWidth = 300;
  return createTextAnnotation(templateLayerName, "company-details", {
    text,
    bbox: [
      layout.pageWidth - layout.margin - textWidth,
      layout.margin,
      textWidth,
      50,
    ],
    fontSize: 14,
    horizontalAlign: "right",
  });
};

const addInvoiceNumberPlaceholder = () => {
  return createTextAnnotation(templateLayerName, invoiceNumberAnnotationId, {
    text: "Invoice N/A",
    bbox: [layout.margin, 250, 250, 50],
    fontSize: 24,
  }).then(() => addHr(templateLayerName, 290));
};

const addCustomerDetailsPlaceholder = () => {
  const text = "N/A";
  return createTextAnnotation(templateLayerName, customerDetailsAnnotationId, {
    text,
    bbox: [layout.margin, 300, 250, 60],
    fontSize: 16,
  });
};

createDocument()
  .then(createTemplateLayer)
  .then(addLogo)
  .then(getPageDimensions)
  .then(addCompanyDetails)
  .then(addInvoiceNumberPlaceholder)
  .then(addCustomerDetailsPlaceholder)
  .then(calculateTableDimensions)
  .then(() =>
    addRow(templateLayerName, ["Item", "Qty", "Unit Cost", "Line total"], 420, {
      style: {
        fontSize: 14,
        fontStyle: ["bold"],
      },
    })
  )
  .then(console.log("Template created"))
  .catch((err) => console.error("Failed to create invoice template", err));
