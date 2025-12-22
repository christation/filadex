import type { Express } from "express";
import { authenticate } from "../auth";
import { storage } from "../storage";
import { logger as appLogger } from "../utils/logger";

export function registerStatisticsRoutes(app: Express): void {
  app.get("/api/statistics", authenticate, async (req, res) => {
    try {
      const filaments = await storage.getFilaments(req.userId);

      const totalSpools = filaments.length;

      let totalWeight = 0;
      let totalRemainingWeight = 0;
      let lowStockCount = 0; // Count of spools with < 25% remaining

      // For material distribution
      const materialCounts: Record<string, number> = {};
      const colorCounts: Record<string, number> = {};

      // For estimated value (average cost per kg is ~30 EUR, adjusting based on material)
      const materialValues: Record<string, number> = {
        'pla': 25,
        'petg': 30,
        'abs': 30,
        'tpu': 40,
        'asa': 40,
        'pa': 60,
        'pc': 60,
        'pva': 65,
        'hips': 30,
        'pla-cf': 50,
        'pa-cf': 75,
        'petg-cf': 55,
        'pet-cf': 55,
        'pla-hf': 35,
        'pp': 40,
        'petg-hf': 40,
        'pps': 80,
        'peek': 150,
        'pei': 100
      };
      const defaultValue = 30; // Default EUR per kg
      let totalValue = 0;
      let totalPurchaseValue = 0;

      // For filament age calculation
      const now = new Date();
      const ageInDays: number[] = [];

      // Oldest and newest filament
      let oldestFilament: {name: string, days: number} | null = null;
      let newestFilament: {name: string, days: number} | null = null;

      filaments.forEach(filament => {
        const total = Number(filament.totalWeight);
        totalWeight += total;

        const remaining = (total * Number(filament.remainingPercentage)) / 100;
        totalRemainingWeight += remaining;

        // Count low stock items
        if (Number(filament.remainingPercentage) < 25) {
          lowStockCount++;
        }

        // Material distribution
        const material = filament.material ? filament.material.toLowerCase() : 'other';
        materialCounts[material] = (materialCounts[material] || 0) + 1;

        // Color distribution
        const color = filament.colorName || 'Unbekannt';
        colorCounts[color] = (colorCounts[color] || 0) + 1;

        // Estimate value of remaining filament
        const materialValue = materialValues[material] || defaultValue;
        const remainingValue = remaining * materialValue;
        totalValue += remainingValue;

        // Calculate total purchase value
        if (filament.purchasePrice) {
          totalPurchaseValue += Number(filament.purchasePrice);
        } else {
          // If no purchase price is set, estimate based on material and weight
          totalPurchaseValue += total * materialValue;
        }

        // Calculate filament age if purchase date exists
        if (filament.purchaseDate) {
          const purchaseDate = new Date(filament.purchaseDate);
          const ageInMilliseconds = now.getTime() - purchaseDate.getTime();
          const days = Math.floor(ageInMilliseconds / (1000 * 60 * 60 * 24));

          ageInDays.push(days);

          // Track oldest filament
          if (oldestFilament === null || days > oldestFilament.days) {
            oldestFilament = {name: filament.name, days};
          }

          // Track newest filament
          if (newestFilament === null || days < newestFilament.days) {
            newestFilament = {name: filament.name, days};
          }
        }
      });

      // Calculate average age of filaments
      const averageAge = ageInDays.length > 0
        ? Math.round(ageInDays.reduce((sum, days) => sum + days, 0) / ageInDays.length)
        : 0;

      const averageRemaining = totalSpools > 0
        ? Math.round((totalRemainingWeight / totalWeight) * 100)
        : 0;

      // Calculate material distribution percentages
      const materialDistribution: {name: string, percentage: number}[] = [];
      Object.entries(materialCounts).forEach(([material, count]) => {
        const percentage = Math.round((count / totalSpools) * 100);
        // Only include materials that represent at least 5% of the collection
        if (percentage >= 5) {
          materialDistribution.push({
            name: material.toUpperCase(),
            percentage
          });
        }
      });

      // Sort by percentage (descending)
      materialDistribution.sort((a, b) => b.percentage - a.percentage);

      // Get top 3 materials
      const topMaterials = materialDistribution.slice(0, 3).map(m => m.name);

      // Get top 3 colors
      const topColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([color]) => color);

      res.json({
        totalSpools,
        totalWeight: totalWeight.toFixed(2),
        remainingWeight: totalRemainingWeight.toFixed(2),
        averageRemaining,
        lowStockCount,
        materialDistribution: materialDistribution.slice(0, 5), // Top 5 materials
        topMaterials,
        topColors,
        estimatedValue: Math.round(totalValue), // Rounded to nearest EUR
        totalPurchaseValue: Math.round(totalPurchaseValue), // Total purchase value
        averageAge, // Average age in days
        oldestFilament, // Oldest filament info
        newestFilament // Newest filament info
      });
    } catch (error) {
      appLogger.error("Error calculating statistics:", error);
      res.status(500).json({ message: "Failed to calculate statistics" });
    }
  });
}

