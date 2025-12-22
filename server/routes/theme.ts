import type { Express } from "express";
import * as fs from "fs";
import * as path from "path";

export function registerThemeRoutes(app: Express): void {
  app.get("/api/theme", (_req, res) => {
    try {
      const themePath = path.resolve('./theme.json');
      if (fs.existsSync(themePath)) {
        const themeData = fs.readFileSync(themePath, 'utf-8');
        res.json(JSON.parse(themeData));
      } else {
        res.json({});
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to read theme" });
    }
  });

  app.post("/api/theme", (req, res) => {
    try {
      const themePath = path.resolve('./theme.json');
      fs.writeFileSync(themePath, JSON.stringify(req.body, null, 2));
      res.json({ message: "Theme updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update theme" });
    }
  });
}

