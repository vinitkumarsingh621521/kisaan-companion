import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { AdvisoryResult } from "@/lib/aiAdvisorSchema";
import { errMsg } from "@/lib/errors";

interface Props {
  targetId: string;
  result: AdvisoryResult;
  farmer: {
    name?: string;
    location?: string;
    season?: string;
  };
}

/**
 * Captures the AI Advisor 25-card grid + farmer header and exports it
 * as a paginated, multi-page A4 PDF using html2canvas + jsPDF.
 */
export default function PdfExportButton({ targetId, result, farmer }: Props) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    const node = document.getElementById(targetId);
    if (!node) {
      toast.error("Could not find report content to export.");
      return;
    }

    setBusy(true);
    const t = toast.loading("Generating your PDF report…");

    try {
      // Render the DOM node to a high-res canvas
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: node.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const headerH = 28;
      const footerH = 10;
      const contentW = pageW - margin * 2;
      const contentH = pageH - headerH - footerH - margin;

      // Image dimensions scaled to fit page width
      const imgW = contentW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const totalPages = Math.max(1, Math.ceil(imgH / contentH));

      const drawHeader = (pageNum: number) => {
        // Header band
        pdf.setFillColor(34, 139, 34);
        pdf.rect(0, 0, pageW, headerH, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("KrishiMitra · AI Farm Advisory", margin, 11);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        const line2 = `Farmer: ${farmer.name || "—"}   |   Location: ${farmer.location || "—"}   |   Season: ${farmer.season || "—"}`;
        pdf.text(line2, margin, 17);
        pdf.text(
          `Generated: ${new Date().toLocaleString()}   |   25-point personalized advisory`,
          margin,
          22
        );
      };

      const drawFooter = (pageNum: number) => {
        pdf.setTextColor(120, 120, 120);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `Page ${pageNum} of ${totalPages}`,
          pageW - margin,
          pageH - 4,
          { align: "right" }
        );
        pdf.text(
          "krishimitra.app · AI guidance — verify locally before action",
          margin,
          pageH - 4
        );
      };

      // Slice the tall canvas across multiple pages
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        drawHeader(page + 1);

        // Vertical offset (in mm) for placing the full image so the
        // current page's slice lines up under the header
        const yOffset = headerH + margin - page * contentH;

        // Clip to the content area so spillover doesn't paint on header/footer
        pdf.saveGraphicsState?.();
        // jsPDF lacks true clipping in basic mode; rely on white over-paint
        pdf.addImage(imgData, "JPEG", margin, yOffset, imgW, imgH, undefined, "FAST");

        // Repaint header band on top in case image bled upward
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, headerH - 0.5, "F");
        drawHeader(page + 1);

        // White footer strip
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pageH - footerH, pageW, footerH, "F");
        drawFooter(page + 1);
      }

      const filename = `KrishiMitra-Advisory-${(farmer.name || "Farm").replace(/\s+/g, "_")}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      pdf.save(filename);
      toast.success("PDF downloaded! 📄", { id: t });
    } catch (e: unknown) {
      console.error("PDF export failed", e);
      toast.error(`Export failed: ${errMsg(e, "Unknown error")}`, { id: t });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={busy}
      size="sm"
      className="gap-1 bg-primary hover:bg-primary/90"
    >
      {busy ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building PDF…
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" /> Download PDF
        </>
      )}
    </Button>
  );
}
