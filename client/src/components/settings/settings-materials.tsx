import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Trash2, GripVertical } from "lucide-react";
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
import { Material, createMaterialSchema } from "./settings-types";
import { ImportExportCard } from "./settings-import-export-card";

export function MaterialsList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { t } = useTranslation();
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["/api/materials"],
    queryFn: () => apiRequest<Material[]>("/api/materials")
  });

  // Gefilterte Materialien basierend auf der Suche
  const filteredMaterials = useMemo(() => {
    return materials.filter(material =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  // Funktion zum Aktualisieren der Reihenfolge
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: number, newOrder: number }) => {
      return apiRequest(`/api/materials/${id}/order`, {
        method: "PATCH",
        body: JSON.stringify({ newOrder })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
    },
    onError: (error) => {
      console.error("Fehler beim Aktualisieren der Reihenfolge:", error);
      toast({
        title: "Fehler",
        description: "Die Reihenfolge konnte nicht aktualisiert werden.",
        variant: "destructive"
      });
    }
  });

  // DnD-Handler für Reihenfolge-Änderung
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const item = materials[sourceIndex];
    updateOrderMutation.mutate({ id: item.id, newOrder: destinationIndex });
  };

  // CSV Format für Materialien
  const materialsCsvFormat = `Name
PLA
PETG
ABS
TPU
...`;

  // Create schema with translations
  const materialSchema = createMaterialSchema(t);
  type FormValues = z.infer<typeof materialSchema>;

  // Form hook
  const form = useForm<FormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: ""
    }
  });

  // Mutation to add a material
  const addMaterialMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest<Material>("/api/materials", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      form.reset();
      toast({
        title: t('settings.materials.addSuccess'),
        description: t('settings.materials.addSuccessDescription')
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('settings.materials.addError'),
        variant: "destructive"
      });
    }
  });

  // Mutation to delete a material
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/materials/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      toast({
        title: t('settings.materials.deleteSuccess'),
        description: t('settings.materials.deleteSuccessDescription')
      });
    },
    onError: (error: any) => {
      let errorMessage = t('settings.materials.deleteError');

      // Try to extract the exact error message from the API response
      if (error?.detail) {
        errorMessage = error.detail;
      } else if (error?.message?.includes("in use by filaments")) {
        errorMessage = t('settings.materials.deleteErrorInUse');
      }

      toast({
        title: t('settings.materials.deleteErrorTitle'),
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Mutation to delete all materials
  const deleteAllMaterialsMutation = useMutation({
    mutationFn: async () => {
      // Delete all materials in parallel and ignore errors for individual ones
      const deletePromises = materials.map(material =>
        apiRequest(`/api/materials/${material.id}`, {
          method: "DELETE"
        }).catch(err => {
          console.warn(`Error deleting material ${material.id}:`, err);
          return null; // Ignore errors for individual materials
        })
      );

      await Promise.all(deletePromises);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/filaments"] });
      toast({
        title: t('settings.materials.deleteAllSuccess'),
        description: t('settings.materials.deleteAllSuccessDescription')
      });
      setIsDeleteConfirmOpen(false);
    },
    onError: (error) => {
      console.error("Error deleting all materials:", error);
      toast({
        title: t('common.error'),
        description: t('settings.materials.deleteAllError'),
        variant: "destructive"
      });
      // Still update the materials list so deleted materials are no longer shown
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsDeleteConfirmOpen(false);
    }
  });

  // Handler für das Absenden des Formulars
  const onSubmit = (data: FormValues) => {
    addMaterialMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col space-y-2">
              <div className="w-full">
                <Input
                  type="text"
                  placeholder={t('settings.materials.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end">
                <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={materials.length === 0}
                      className="theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                    >
                      {t('settings.materials.deleteAll')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('settings.materials.deleteAllConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('settings.materials.deleteAllConfirmDescription', { count: materials.length })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAllMaterialsMutation.mutate()}
                        className="theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                      >
                        {t('settings.materials.deleteAllConfirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">{t('settings.materials.loading')}</div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-4 text-neutral-400">
                {materials.length === 0 ? t('settings.materials.noMaterials') : t('common.noResults')}
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-[65%]">{t('common.name')}</TableHead>
                      <TableHead className="text-right w-16">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="materials">
                      {(provided) => (
                        <TableBody
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          {filteredMaterials.map((material, index) => (
                            <Draggable
                              key={material.id.toString()}
                              draggableId={material.id.toString()}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <TableRow
                                  key={material.id}
                                  className={`h-10 ${snapshot.isDragging ? "opacity-50" : ""}`}
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                >
                                  <TableCell className="py-1 w-10">
                                    <div {...provided.dragHandleProps} className="cursor-grab">
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-1 truncate">
                                    <Badge className="px-2 py-1 theme-primary-bg-20 text-white border-white/20 truncate max-w-full">
                                      <span className="truncate" title={material.name}>
                                        {material.name}
                                      </span>
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right py-1 whitespace-nowrap w-16">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                                      onClick={() => deleteMaterialMutation.mutate(material.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </TableBody>
                      )}
                    </Droppable>
                  </DragDropContext>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-2">{t('settings.materials.addTitle')}</h3>
              <p className="text-sm text-neutral-400 mb-4">
                {t('settings.materials.addDescription')}
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
                          <Input placeholder={t('settings.materials.namePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full theme-primary-bg-20 hover:theme-primary-bg-30 text-white border-white/20"
                    disabled={addMaterialMutation.isPending}
                  >
                    {t('settings.materials.addButton')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      <ImportExportCard
        endpoint="/api/materials"
        csvFormat={materialsCsvFormat}
        fields={["name"]}
        title={t('settings.materials.importExport')}
      />
    </div>
  );
}

