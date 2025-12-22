import { useState, useRef, ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Upload, Download, FileText, Info, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n";

interface ImportExportCardProps {
  endpoint: string;
  csvFormat: string;
  hasHeaders?: boolean;
  fields: string[];
  title?: string;
}

export function ImportExportCard({ endpoint, csvFormat, hasHeaders = true, fields, title = "Import/Export" }: ImportExportCardProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importExportOpen, setImportExportOpen] = useState<string>("");
  const { t } = useTranslation();
  const [csvUploadStatus, setCsvUploadStatus] = useState<{
    status: "idle" | "processing" | "success" | "error";
    message: string;
    added: number;
    skipped: number;
    errored: number;
  }>({
    status: "idle",
    message: "",
    added: 0,
    skipped: 0,
    errored: 0
  });

  // CSV Import Handler
  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Set status to 'processing'
    setCsvUploadStatus({
      status: "processing",
      message: t('common.importExport.processing'),
      added: 0,
      skipped: 0,
      errored: 0
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvData = e.target?.result as string;

        // Sende Daten an den Server
        const result = await apiRequest(`${endpoint}?import=csv`, {
          method: "POST",
          body: JSON.stringify({ csvData })
        });

        // Update status
        setCsvUploadStatus({
          status: "success",
          message: t('common.importExport.successMessage', {
            created: result.created,
            duplicates: result.duplicates,
            errors: result.errors
          }),
          added: result.created,
          skipped: result.duplicates,
          errored: result.errors
        });

        // Invalidiere Queries, um Daten neu zu laden
        queryClient.invalidateQueries({ queryKey: [endpoint] });
        queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      } catch (error) {
        console.error("Error processing CSV file:", error);
        setCsvUploadStatus({
          status: "error",
          message: t('common.importExport.errorMessage'),
          added: 0,
          skipped: 0,
          errored: 0
        });
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (event.target) {
      event.target.value = "";
    }
  };

  // CSV Export Handler
  const handleExport = async () => {
    try {
      // CSV über API abholen
      window.location.href = `${endpoint}?export=csv`;
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: t('common.importExport.exportErrorTitle'),
        description: t('common.importExport.exportErrorDescription'),
        variant: "destructive"
      });
    }
  };

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      value={importExportOpen}
      onValueChange={setImportExportOpen}
    >
      <AccordionItem value="import-export" className="border-b-0">
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            <span>{title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t('common.importExport.csvFormatTitle')}</AlertTitle>
              <AlertDescription className="text-xs">
                {t('common.importExport.csvFormatDescription')}
                <pre className="mt-2 p-2 dark:bg-neutral-900 bg-gray-100 rounded text-xs overflow-x-auto dark:text-white text-gray-800">
                  {csvFormat}
                </pre>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                className="hidden"
                onChange={handleCsvUpload}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                disabled={csvUploadStatus.status === "processing"}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('common.importExport.importButton')}
              </Button>

              <Button
                onClick={handleExport}
                className="w-full bg-emerald-900/20 hover:bg-emerald-900/30 text-white border-white/20"
              >
                <Download className="mr-2 h-4 w-4" />
                {t('common.importExport.exportButton')}
              </Button>
            </div>

            {csvUploadStatus.status !== "idle" && (
              <Alert className={csvUploadStatus.status === "error" ? "bg-red-900/20" :
                            csvUploadStatus.status === "success" ? "bg-green-900/20" :
                            "bg-yellow-900/20"}>
                {csvUploadStatus.status === "error" && <AlertTriangle className="h-4 w-4" />}
                {csvUploadStatus.status === "success" && <FileText className="h-4 w-4" />}
                {csvUploadStatus.status === "processing" && <span className="animate-pulse">⏳</span>}
                <AlertTitle>
                  {csvUploadStatus.status === "error" ? t('common.importExport.errorTitle') :
                  csvUploadStatus.status === "success" ? t('common.importExport.successTitle') :
                  t('common.importExport.processingTitle')}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  {csvUploadStatus.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

