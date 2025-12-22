import { useState, useMemo, useRef, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Search, X, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "@/i18n";
import { Color, createColorSchema } from "./settings-types";
// CSV parsing function (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function ColorsList() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
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

  // CSV Format für Farben
  const colorsCsvFormat = `Brand,Color Name,Hex Code
Bambu Lab,Dark Gray,#545454
Bambu Lab,Black,#000000
Prusament,Galaxy Black,#111111
...`;
  const { data: colors = [], isLoading } = useQuery({
    queryKey: ["/api/colors"],
    queryFn: () => apiRequest<Color[]>("/api/colors")
  });

  // Gefilterte Farben basierend auf der Suche
  const filteredColors = useMemo(() => {
    return colors.filter(color =>
      color.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [colors, searchTerm]);

  // Create schema with translations
  const colorSchema = createColorSchema(t);
  type FormValues = z.infer<typeof colorSchema>;

  // Form hook
  const form = useForm<FormValues>({
    resolver: zodResolver(colorSchema),
    defaultValues: {
      name: "",
      code: "#000000"
    }
  });

  // Mutation to add a color
  const addColorMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest<Color>("/api/colors", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      form.reset({ name: "", code: "#000000" });
      toast({
        title: t('settings.colors.addSuccess'),
        description: t('settings.colors.addSuccessDescription')
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('settings.colors.addError'),
        variant: "destructive"
      });
    }
  });

  // Mutation to delete a color
  const deleteColorMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/colors/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      toast({
        title: t('settings.colors.deleteSuccess'),
        description: t('settings.colors.deleteSuccessDescription')
      });
    },
    onError: (error: any) => {
      let errorMessage = t('settings.colors.deleteError');

      // Try to extract the exact error message from the API response
      if (error?.detail) {
        errorMessage = error.detail;
      } else if (error?.message?.includes("in use by filaments")) {
        errorMessage = t('settings.colors.deleteErrorInUse');
      }

      toast({
        title: t('settings.colors.deleteErrorTitle'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Handler für das Absenden des Formulars
  const onSubmit = (data: FormValues) => {
    addColorMutation.mutate(data);
  };

  // CSV Import Funktion
  const handleCsvUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploadStatus({
      status: "processing",
      message: "CSV-Datei wird verarbeitet...",
      added: 0,
      skipped: 0,
      errored: 0
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        setCsvUploadStatus({
          status: "error",
          message: "Die Datei konnte nicht gelesen werden.",
          added: 0,
          skipped: 0,
          errored: 0
        });
        return;
      }

      const lines = result.split('\n');
      let added = 0;
      let skipped = 0;
      let errored = 0;

      // Hole aktuelle Farben, um Duplikate zu vermeiden
      const existingColors = await apiRequest<Color[]>("/api/colors");
      const existingColorNames = new Set(existingColors.map(c => c.name));

      // Skip header row if present
      const startIndex = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('brand') ? 1 : 0;

      // Process each line
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = parseCSVLine(line);
          let name: string;
          let code: string;

          if (values.length >= 3) {
            // Format: Brand,Color Name,Hex Code
            const brand = values[0].trim().replace(/"/g, '');
            const colorName = values[1].trim().replace(/"/g, '');
            name = `${colorName} (${brand})`;
            code = values[2].trim().replace(/"/g, '');
          } else if (values.length >= 2) {
            // Format: Name,Code
            name = values[0].trim().replace(/"/g, '');
            code = values[1].trim().replace(/"/g, '');
          } else {
            errored++;
            continue;
          }

          if (!name || !code) {
            errored++;
            continue;
          }

          // Make sure code is a valid color code
          if (!code.startsWith('#')) {
            code = '#' + code;
          }

          // Check if color already exists
          if (existingColorNames.has(name)) {
            skipped++;
            continue;
          }

          // Create new color
          const validatedData = colorSchema.parse({ name, code });
          await apiRequest<Color>("/api/colors", {
            method: "POST",
            body: JSON.stringify(validatedData)
          });

          added++;
          existingColorNames.add(name);
        } catch (err) {
          errored++;
          console.error(`Error importing color at line ${i + 1}:`, err);
        }
      }

      // Aktualisiere Status und UI
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });

      setCsvUploadStatus({
        status: "success",
        message: `CSV-Import abgeschlossen. ${added} Farben hinzugefügt, ${skipped} übersprungen, ${errored} Fehler.`,
        added,
        skipped,
        errored
      });

      toast({
        title: "CSV-Import abgeschlossen",
        description: `${added} Farben hinzugefügt, ${skipped} übersprungen, ${errored} Fehler.`
      });

      // Reset Dateiauswahl
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setCsvUploadStatus({
        status: "error",
        message: "Die Datei konnte nicht gelesen werden.",
        added: 0,
        skipped: 0,
        errored: 0
      });
    };

    reader.readAsText(file);
  };

  // Delete all colors
  const deleteAllColorsMutation = useMutation({
    mutationFn: async () => {
      // Delete all colors in parallel and ignore errors for individual ones
      const deletePromises = colors.map(color =>
        apiRequest(`/api/colors/${color.id}`, {
          method: "DELETE"
        }).catch(err => {
          console.warn(`Error deleting color ${color.id}:`, err);
          return null; // Ignore errors for individual colors
        })
      );

      await Promise.all(deletePromises);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      toast({
        title: t('settings.colors.deleteAllSuccess'),
        description: t('settings.colors.deleteAllSuccessDescription')
      });
      setIsDeleteConfirmOpen(false);
    },
    onError: (error) => {
      console.error("Error deleting all colors:", error);
      toast({
        title: t('common.error'),
        description: t('settings.colors.deleteAllError'),
        variant: "destructive"
      });
      // Still update the colors list so deleted colors are no longer shown
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
      setIsDeleteConfirmOpen(false);
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col space-y-2">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('settings.colors.searchPlaceholder')}
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex justify-end">
                <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={colors.length === 0}
                      className="theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                    >
                      {t('settings.colors.deleteAll')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('settings.colors.deleteAllConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('settings.colors.deleteAllConfirmDescription', { count: colors.length })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAllColorsMutation.mutate()}
                        className="theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                      >
                        {t('settings.colors.deleteAllConfirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">{t('settings.colors.loading')}</div>
            ) : filteredColors.length === 0 ? (
              <div className="text-center py-4 text-neutral-400">
                {colors.length === 0 ? t('settings.colors.noColors') : t('common.noResults')}
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.name')}</TableHead>
                      <TableHead>{t('settings.colors.code')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredColors.map((color) => (
                      <TableRow key={color.id}>
                        <TableCell>{color.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: color.code }}
                            />
                            <span>{color.code}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                            onClick={() => deleteColorMutation.mutate(color.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-2">{t('settings.colors.addTitle')}</h3>
              <p className="text-sm text-neutral-400 mb-4">
                {t('settings.colors.addDescription')}
              </p>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.name')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('settings.colors.namePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.colors.code')}</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              className="w-16 h-10"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            <Input placeholder="#000000" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                    disabled={addColorMutation.isPending}
                  >
                    {t('settings.colors.addButton')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-2">{t('settings.colors.csvImport')}</h3>
              <p className="text-sm text-neutral-400 mb-4">
                {t('settings.colors.csvImportDescription')}
              </p>
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
                {csvUploadStatus.status === "processing" ? t('common.importExport.processing') : t('common.importExport.importButton')}
              </Button>
              {csvUploadStatus.status !== "idle" && (
                <div className="mt-2 text-sm">
                  {csvUploadStatus.status === "success" && (
                    <div className="text-green-500">
                      {t('common.importExport.successTitle')}: {csvUploadStatus.added} {t('common.added')}, {csvUploadStatus.skipped} {t('common.skipped')}, {csvUploadStatus.errored} {t('common.errors')}
                    </div>
                  )}
                  {csvUploadStatus.status === "error" && (
                    <div className="text-red-500">
                      {t('common.importExport.errorTitle')}: {csvUploadStatus.message}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

