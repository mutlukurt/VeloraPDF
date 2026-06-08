import * as DocumentPicker from "expo-document-picker";
import { copyPdfToLocal } from "./pdfStorage";

export async function pickAndCopyPdf() {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false
  });

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset || !asset.name?.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please choose a PDF file.");
  }

  return copyPdfToLocal({ name: asset.name, uri: asset.uri });
}
