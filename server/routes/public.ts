import type { Express } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db";
import { users, userSharing } from "../../shared/schema";
import { authenticate } from "../auth";
import { storage } from "../storage";
import { logger as appLogger } from "../utils/logger";
import { validateId } from "../utils/validation";

export function registerPublicRoutes(app: Express): void {
  // Keep the old endpoint for backward compatibility
  app.get("/api/public/filaments/:userId", async (req, res) => {
    try {
      const userId = validateId(req.params.userId);
      if (userId === null) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Get user information
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Redirect to the new endpoint
      res.redirect(`/api/public/filaments/user/${user.username}`);
    } catch (error) {
      appLogger.error("Get public filaments error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get public filaments for a specific user by ID
  app.get("/api/public/filaments/:userId", async (req, res) => {
    try {
      const userId = validateId(req.params.userId);
      if (userId === null) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Get user information
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's sharing settings
      const sharingSettings = await db.select().from(userSharing)
        .where(and(
          eq(userSharing.userId, userId),
          eq(userSharing.isPublic, true)
        ));

      // Check if user has any public filaments
      if (sharingSettings.length === 0) {
        return res.status(404).json({ message: "No public filaments found" });
      }

      // Check if user has global sharing enabled
      const hasGlobalSharing = sharingSettings.some((s: any) => s.materialId === null);

      // Get shared materials
      const sharedMaterialIds = sharingSettings
        .filter((s: any) => s.materialId !== null)
        .map((s: any) => s.materialId);

      // Get all filaments for this user
      const filaments = await storage.getFilaments(userId);

      // Filter filaments based on sharing settings
      const publicFilaments = filaments.filter((filament: any) => {
        // Check for global sharing (null materialId)
        if (hasGlobalSharing) return true;

        // Check for material-specific sharing
        return filament.material &&
               sharedMaterialIds.includes(parseInt(filament.material));
      });

      // Return filaments with user information
      res.json({
        filaments: publicFilaments,
        user: {
          id: user.id,
          username: user.username
        }
      });
    } catch (error) {
      appLogger.error("Get public filaments error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // User sharing routes
  app.post("/api/sharing", authenticate, async (req, res) => {
    try {
      const { materialId, isPublic } = req.body;

      // Check if sharing already exists
      const existingSharing = await db.select()
        .from(userSharing)
        .where(
          materialId
            ? and(eq(userSharing.userId, req.userId), eq(userSharing.materialId, materialId))
            : and(eq(userSharing.userId, req.userId), isNull(userSharing.materialId))
        );

      if (existingSharing.length > 0) {
        // Update existing sharing
        const [updated] = await db.update(userSharing)
          .set({ isPublic })
          .where(eq(userSharing.id, existingSharing[0].id))
          .returning();

        return res.json(updated);
      }

      // Create new sharing
      const [newSharing] = await db.insert(userSharing)
        .values({
          userId: req.userId,
          materialId: materialId || null,
          isPublic
        })
        .returning();

      res.status(201).json(newSharing);
    } catch (error) {
      appLogger.error("Error updating sharing:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/sharing", authenticate, async (req, res) => {
    try {
      const sharingSettings = await db.select().from(userSharing)
        .where(eq(userSharing.userId, req.userId));

      res.json(sharingSettings);
    } catch (error) {
      appLogger.error("Error fetching sharing:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Additional public filament route (duplicate for backward compatibility)
  app.get("/api/public/filaments/:userId", async (req, res) => {
    try {
      const userId = validateId(req.params.userId);
      if (userId === null) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Get user's sharing settings
      const sharingSettings = await db.select()
        .from(userSharing)
        .where(and(
          eq(userSharing.userId, userId),
          eq(userSharing.isPublic, true)
        ));

      if (sharingSettings.length === 0) {
        return res.status(404).json({ message: "No shared filaments found" });
      }

      // Check if user has global sharing enabled
      const hasGlobalSharing = sharingSettings.some((s: any) => s.materialId === null);

      // Get shared materials
      const sharedMaterialIds = sharingSettings
        .filter((s: any) => s.materialId !== null)
        .map((s: any) => s.materialId);

      // Get all filaments for this user
      const allFilaments = await storage.getFilaments(userId);

      // Filter filaments based on sharing settings
      const sharedFilaments = allFilaments.filter((filament: any) => {
        // Check for global sharing
        if (hasGlobalSharing) return true;

        // Check for material-specific sharing
        return filament.material &&
               sharedMaterialIds.includes(parseInt(filament.material));
      });

      res.json(sharedFilaments);
    } catch (error) {
      appLogger.error("Get public filaments error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}

