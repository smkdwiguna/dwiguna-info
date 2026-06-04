"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/spinner";

export interface QrBox {
	page: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface PdfViewerProps {
	/** Source PDF as bytes (preferred) or a URL. */
	data?: Uint8Array | null;
	url?: string | null;
	/** Enable QR placement overlay + interactions. */
	placementMode?: boolean;
	box?: QrBox | null;
	onBoxChange?: (box: QrBox) => void;
}

interface RenderedPage {
	index: number;
	width: number;
	height: number;
	dataUrl: string;
}

const DEFAULT_BOX_RATIO = 0.18;

export function PdfViewer({
	data,
	url,
	placementMode = false,
	box,
	onBoxChange,
}: PdfViewerProps) {
	const [pages, setPages] = useState<RenderedPage[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
	const dragState = useRef<{
		mode: "move" | "resize";
		startX: number;
		startY: number;
		origin: QrBox;
		pageW: number;
		pageH: number;
	} | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function render() {
			setLoading(true);
			setError(null);
			try {
				const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
				pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

				let source: { data: Uint8Array } | { url: string };
				if (data) {
					source = { data: data.slice() };
				} else if (url) {
					source = { url };
				} else {
					setError("Tidak ada berkas PDF.");
					setLoading(false);
					return;
				}

				const loadingTask = pdfjs.getDocument(source);
				const pdf = await loadingTask.promise;
				const rendered: RenderedPage[] = [];
				const targetWidth = 1000;

				for (let i = 1; i <= pdf.numPages; i++) {
					const page = await pdf.getPage(i);
					const baseViewport = page.getViewport({ scale: 1 });
					const scale = targetWidth / baseViewport.width;
					const viewport = page.getViewport({ scale });
					const canvas = document.createElement("canvas");
					canvas.width = viewport.width;
					canvas.height = viewport.height;
					const ctx = canvas.getContext("2d");
					if (!ctx) continue;
					await page.render({ canvasContext: ctx, viewport, canvas }).promise;
					rendered.push({
						index: i - 1,
						width: viewport.width,
						height: viewport.height,
						dataUrl: canvas.toDataURL("image/png"),
					});
					if (cancelled) return;
				}
				if (!cancelled) {
					setPages(rendered);
					pageRefs.current = new Array(rendered.length).fill(null);
				}
			} catch (err) {
				console.error("Failed to render PDF", err);
				if (!cancelled) setError("Gagal memuat PDF.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		render();
		return () => {
			cancelled = true;
		};
	}, [data, url]);

	const handlePagePointerDown = useCallback(
		(pageIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
			if (!placementMode || !onBoxChange) return;
			// Ignore clicks that start on the existing box (handled separately).
			const target = e.target as HTMLElement;
			if (target.dataset.qrHandle || target.dataset.qrBox) return;

			const rect = e.currentTarget.getBoundingClientRect();
			const relX = (e.clientX - rect.left) / rect.width;
			const relY = (e.clientY - rect.top) / rect.height;
			const width = DEFAULT_BOX_RATIO;
			// Keep the box visually square: equal pixel width/height means the
			// normalized height must scale by the page's width/height ratio.
			const height = Math.min(width * (rect.width / rect.height), 1);
			onBoxChange({
				page: pageIndex,
				x: Math.min(Math.max(relX - width / 2, 0), 1 - width),
				y: Math.min(Math.max(relY - height / 2, 0), 1 - height),
				width,
				height,
			});
		},
		[placementMode, onBoxChange],
	);

	const startDrag = useCallback(
		(
			mode: "move" | "resize",
			e: React.PointerEvent<HTMLDivElement>,
			pageEl: HTMLDivElement | null,
		) => {
			if (!box || !onBoxChange || !pageEl) return;
			e.stopPropagation();
			e.preventDefault();
			const rect = pageEl.getBoundingClientRect();
			dragState.current = {
				mode,
				startX: e.clientX,
				startY: e.clientY,
				origin: { ...box },
				pageW: rect.width,
				pageH: rect.height,
			};
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		},
		[box, onBoxChange],
	);

	const onPointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const state = dragState.current;
			if (!state || !box || !onBoxChange) return;
			const dx = (e.clientX - state.startX) / state.pageW;
			const dy = (e.clientY - state.startY) / state.pageH;
			if (state.mode === "move") {
				onBoxChange({
					...box,
					x: Math.min(Math.max(state.origin.x + dx, 0), 1 - box.width),
					y: Math.min(Math.max(state.origin.y + dy, 0), 1 - box.height),
				});
			} else {
				// Resize while locking a 1:1 pixel aspect ratio (square QR). Grow
				// from whichever axis the user drags further, then derive the other.
				const ratio = state.pageW / state.pageH;
				const widthFromX = state.origin.width + dx;
				const widthFromY = (state.origin.height + dy) / ratio;
				let newWidth = Math.max(widthFromX, widthFromY, 0.05);
				newWidth = Math.min(newWidth, 1 - box.x);
				let newHeight = newWidth * ratio;
				if (box.y + newHeight > 1) {
					newHeight = 1 - box.y;
					newWidth = newHeight / ratio;
				}
				onBoxChange({ ...box, width: newWidth, height: newHeight });
			}
		},
		[box, onBoxChange],
	);

	const endDrag = useCallback(() => {
		dragState.current = null;
	}, []);

	if (loading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<Spinner size={48} variant="muted" />
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex h-64 items-center justify-center text-sm text-destructive">
				{error}
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-4">
			{pages.map((page) => (
				<div
					key={page.index}
					ref={(el) => {
						pageRefs.current[page.index] = el;
					}}
					className="relative w-full max-w-3xl shadow-sm ring-1 ring-border"
					style={{
						aspectRatio: `${page.width} / ${page.height}`,
						touchAction: placementMode ? "none" : undefined,
					}}
					onPointerDown={(e) => handlePagePointerDown(page.index, e)}
					onPointerMove={onPointerMove}
					onPointerUp={endDrag}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={page.dataUrl}
						alt={`Halaman ${page.index + 1}`}
						className="h-full w-full select-none"
						draggable={false}
					/>
					{placementMode && box && box.page === page.index && (
						<div
							data-qr-box="1"
							className="absolute cursor-move rounded-sm border-2 border-primary bg-primary/20"
							style={{
								left: `${box.x * 100}%`,
								top: `${box.y * 100}%`,
								width: `${box.width * 100}%`,
								height: `${box.height * 100}%`,
							}}
							onPointerDown={(e) =>
								startDrag("move", e, pageRefs.current[page.index])
							}
							onPointerMove={onPointerMove}
							onPointerUp={endDrag}
						>
							<span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium text-primary">
								QR
							</span>
							<div
								data-qr-handle="1"
								className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border-2 border-primary bg-background"
								onPointerDown={(e) =>
									startDrag("resize", e, pageRefs.current[page.index])
								}
								onPointerMove={onPointerMove}
								onPointerUp={endDrag}
							/>
						</div>
					)}
					<span className="pointer-events-none absolute bottom-1 right-2 rounded bg-background/70 px-1 text-[10px] text-muted-foreground">
						{page.index + 1}/{pages.length}
					</span>
				</div>
			))}
		</div>
	);
}
