import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "@/i18n";
import { Diameter, createDiameterSchema } from "./settings-types";
import { ImportExportCard } from "./settings-import-export-card";

export function DiametersList() {
  const queryClient = useQueryClient();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { t } = useTranslation();
  const { data: diameters = [], isLoading } = useQuery({
    queryKey: ["/api/diameters"],
    queryFn: () => apiRequest<Diameter[]>("/api/diameters")
  });

  // CSV Format für Durchmesser
  const diametersCsvFormat = `Wert
1.75
2.85
3.00
...`;

  // Create schema with translations
  const diameterSchema = createDiameterSchema(t);
  type FormValues = z.infer<typeof diameterSchema>;

  // Form hook
  const form = useForm<FormValues>({
    resolver: zodResolver(diameterSchema),
    defaultValues: {
      value: ""
    }
  });

  // Mutation to add a diameter
  const addDiameterMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest<Diameter>("/api/diameters", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diameters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      form.reset();
      toast({
        title: t('settings.diameters.addSuccess'),
        description: t('settings.diameters.addSuccessDescription')
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('settings.diameters.addError'),
        variant: "destructive"
      });
    }
  });

  // Mutation to delete a diameter
  const deleteDiameterMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/diameters/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diameters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      toast({
        title: t('settings.diameters.deleteSuccess'),
        description: t('settings.diameters.deleteSuccessDescription')
      });
    },
    onError: (error: any) => {
      let errorMessage = t('settings.diameters.deleteError');

      // Try to extract the exact error message from the API response
      if (error?.detail) {
        errorMessage = error.detail;
      } else if (error?.message?.includes("in use by filaments")) {
        errorMessage = t('settings.diameters.deleteErrorInUse');
      }

      toast({
        title: t('settings.diameters.deleteErrorTitle'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Mutation to delete all diameters
  const deleteAllDiametersMutation = useMutation({
    mutationFn: async () => {
      // Delete all diameters in parallel and ignore errors for individual ones
      const deletePromises = diameters.map(diameter =>
        apiRequest(`/api/diameters/${diameter.id}`, {
          method: "DELETE"
        }).catch(err => {
          console.warn(`Error deleting diameter ${diameter.id}:`, err);
          return null; // Ignore errors for individual diameters
        })
      );

      await Promise.all(deletePromises);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diameters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      toast({
        title: t('settings.diameters.deleteAllSuccess'),
        description: t('settings.diameters.deleteAllSuccessDescription')
      });
      setIsDeleteConfirmOpen(false);
    },
    onError: (error) => {
      console.error("Error deleting all diameters:", error);
      toast({
        title: t('common.error'),
        description: t('settings.diameters.deleteAllError'),
        variant: "destructive"
      });
      // Still update the diameters list so deleted diameters are no longer shown
      queryClient.invalidateQueries({ queryKey: ["/api/diameters"] });
      setIsDeleteConfirmOpen(false);
    }
  });

  // Handler für das Absenden des Formulars
  const onSubmit = (data: FormValues) => {
    addDiameterMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex justify-end">
              <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={diameters.length === 0}
                    className="theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                  >
                    {t('settings.diameters.deleteAll')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.diameters.deleteAllConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('settings.diameters.deleteAllConfirmDescription', { count: diameters.length })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllDiametersMutation.mutate()}
                      className="theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                    >
                      {t('settings.diameters.deleteAllConfirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">{t('settings.diameters.loading')}</div>
            ) : diameters.length === 0 ? (
              <div className="text-center py-4 text-neutral-400">
                {t('settings.diameters.noDiameters')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
                {diameters.map((diameter) => (
                  <Badge
                    key={diameter.id}
                    className="flex items-center gap-2 px-3 py-1.5 theme-primary-bg-20 text-white hover:theme-primary-bg-30 border-white/20"
                  >
                    {diameter.value} mm
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1 -mr-1 text-white hover:theme-primary-bg-30"
                      onClick={() => deleteDiameterMutation.mutate(diameter.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-2">{t('settings.diameters.addTitle')}</h3>
              <p className="text-sm text-neutral-400 mb-4">
                {t('settings.diameters.addDescription')}
              </p>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.diameters.value')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('settings.diameters.valuePlaceholder')} {...field} type="number" step="0.01" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                    disabled={addDiameterMutation.isPending}
                  >
                    {t('settings.diameters.addButton')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      <ImportExportCard
        endpoint="/api/diameters"
        csvFormat={diametersCsvFormat}
        fields={["value"]}
        title={t('settings.diameters.importExport')}
      />
    </div>
  );
}

