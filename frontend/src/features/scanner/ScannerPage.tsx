import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Search, QrCode as QrIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Basics";
import { publicService } from "@/services";

export function ScannerPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Guards against React 18 StrictMode's mount -> cleanup -> mount dance in dev,
    // and against fast route re-entry in prod. Without this flag, a second effect
    // run can start a fresh camera stream on the same DOM node while the first
    // instance's start() promise is still resolving in the background — the two
    // instances then fight over the <video> element and nothing renders until a
    // full page refresh clears both. Tracking "cancelled" lets a start-in-flight
    // instance clean itself up instead of leaving a zombie stream behind.
    let cancelled = false;
    const scanner = new Html5Qrcode(containerRef.current.id);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => handleScanned(decodedText),
        () => {}
      )
      .then(() => {
        if (cancelled) {
          scanner
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                scanner.clear();
              } catch {
                /* no-op: element may already be gone */
              }
            });
          return;
        }
        setScanning(true);
      })
      .catch(() => {
        if (!cancelled) setError("Camera access is needed to scan. You can search manually below instead.");
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            scanner.clear();
          } catch {
            /* no-op: element may already be gone */
          }
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScanned(decodedText: string) {
    scannerRef.current?.pause(true);
    let token = decodedText.trim();
    const match = token.match(/\/i\/([a-zA-Z0-9]+)/);
    if (match) token = match[1];
    goToItem(token);
  }

  async function goToItem(token: string) {
    try {
      const item = await publicService.getItem(token);
      if (item.is_staff && item.item_id) {
        navigate(`/sales/${saleId}/items/${item.item_id}`);
      } else {
        navigate(`/i/${token}`);
      }
    } catch {
      toast.error("Couldn't find that item.");
      scannerRef.current?.resume();
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex flex-col items-center text-center mb-6">
        <span className="h-12 w-12 rounded-2xl bg-marigold-light flex items-center justify-center mb-3">
          <QrIcon className="h-6 w-6 text-marigold-dark" />
        </span>
        <h1 className="text-2xl font-bold">Scan Item</h1>
        <p className="text-ink-faint text-sm mt-1">Point your camera at a label to open it instantly.</p>
      </div>

      <div className="card overflow-hidden aspect-square relative">
        <div id="qr-reader" ref={containerRef} className="h-full w-full [&>video]:object-cover [&>video]:h-full [&>video]:w-full" />
        {!scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-ink-faint text-sm">Starting camera…</div>
        )}
        {error && <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-ink-faint px-6 bg-paper-soft">{error}</div>}
      </div>

      <div className="mt-6">
        <p className="label mb-2">Or find it manually</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) goToItem(manualCode.trim());
          }}
        >
          <input className="input" placeholder="Item reference or QR code" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
          <Button type="submit" icon={Search} variant="secondary">
            Go
          </Button>
        </form>
        <Button variant="ghost" className="w-full mt-2" onClick={() => navigate(`/sales/${saleId}/inventory`)}>
          Search inventory instead
        </Button>
      </div>
    </div>
  );
}
