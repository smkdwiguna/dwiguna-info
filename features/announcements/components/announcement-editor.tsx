"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { Button } from "@/components/ui/button";
import {
	Bold,
	Italic,
	Strikethrough,
	List,
	ListOrdered,
	Image as ImageIcon,
	Link as LinkIcon,
	Unlink,
	Heading1,
	Heading2,
	Heading3,
	Video,
	FileDown,
} from "lucide-react";
import { useCallback, useState } from "react";
import { uploadAnnouncementImage } from "../actions/upload";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";

interface AnnouncementEditorProps {
	value: string;
	onChange: (value: string) => void;
}

export function AnnouncementEditor({
	value,
	onChange,
}: AnnouncementEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				link: {
					openOnClick: false,
				},
			}),
			Image.configure({
				HTMLAttributes: {
					referrerpolicy: "no-referrer",
				},
			}),
			Youtube.configure({
				width: 480,
				height: 320,
			}),
		],
		content: value,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
	});

	const [isUploading, setIsUploading] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
	const [imageUrl, setImageUrl] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false);
	const [youtubeUrl, setYoutubeUrl] = useState("");

	const toggleBold = useCallback(() => {
		editor?.chain().focus().toggleBold().run();
	}, [editor]);

	const toggleItalic = useCallback(() => {
		editor?.chain().focus().toggleItalic().run();
	}, [editor]);

	const toggleStrike = useCallback(() => {
		editor?.chain().focus().toggleStrike().run();
	}, [editor]);

	const toggleBulletList = useCallback(() => {
		editor?.chain().focus().toggleBulletList().run();
	}, [editor]);

	const toggleOrderedList = useCallback(() => {
		editor?.chain().focus().toggleOrderedList().run();
	}, [editor]);

	const toggleHeading = useCallback(
		(level: 1 | 2 | 3) => {
			editor?.chain().focus().toggleHeading({ level }).run();
		},
		[editor],
	);

	const setLink = useCallback(() => {
		if (linkUrl === null) {
			return;
		}

		if (linkUrl === "") {
			editor?.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}

		editor
			?.chain()
			.focus()
			.extendMarkRange("link")
			.setLink({ href: linkUrl })
			.run();

		setLinkUrl("");
		setIsLinkDialogOpen(false);
	}, [editor, linkUrl]);

	const unsetLink = useCallback(() => {
		editor?.chain().focus().unsetLink().run();
	}, [editor]);

	const handleImageUpload = useCallback(async () => {
		if (!selectedFile) {
			toast.error("Pilih berkas terlebih dahulu");
			return;
		}

		setIsUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", selectedFile);
			const result = await uploadAnnouncementImage(formData);
			console.log(result);
			editor?.chain().focus().setImage({ src: result.url }).run();
			setIsImageDialogOpen(false);
			setSelectedFile(null);
			setImageUrl("");
		} catch (error) {
			console.error("Failed to upload image", error);
			toast.error("Gagal mengunggah gambar");
		} finally {
			setIsUploading(false);
		}
	}, [editor, selectedFile]);

	const addImageUrl = useCallback(() => {
		if (imageUrl) {
			editor?.chain().focus().setImage({ src: imageUrl }).run();
			setIsImageDialogOpen(false);
			setImageUrl("");
			setSelectedFile(null);
		}
	}, [editor, imageUrl]);

	const addYoutubeVideo = useCallback(() => {
		if (youtubeUrl) {
			editor?.commands.setYoutubeVideo({
				src: youtubeUrl,
			});
			setIsYoutubeDialogOpen(false);
			setYoutubeUrl("");
		}
	}, [editor, youtubeUrl]);

	const handleFileUpload = useCallback(async () => {
		if (!selectedFile) {
			toast.error("Pilih berkas terlebih dahulu");
			return;
		}

		setIsUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", selectedFile);
			const result = await uploadAnnouncementImage(formData);

			// For generic files, insert a link to download/view the file
			editor
				?.chain()
				.focus()
				.insertContent(
					`<a href="${result.url}" target="_blank">Unduh ${selectedFile.name}</a>`,
				)
				.run();

			setIsImageDialogOpen(false); // Also using this dialog for generic files for now
			setSelectedFile(null);
		} catch (error) {
			console.error("Failed to upload file", error);
			toast.error("Gagal mengunggah berkas");
		} finally {
			setIsUploading(false);
		}
	}, [editor, selectedFile]);

	if (!editor) {
		return null;
	}

	return (
		<div className="border border-input rounded-md overflow-hidden bg-background flex flex-col h-full">
			<div className="bg-muted p-2 flex flex-wrap gap-1 border-b border-input items-center sticky top-0 z-10">
				<Button
					variant="ghost"
					size="sm"
					onClick={toggleBold}
					className={
						editor.isActive("bold") ? "bg-accent text-accent-foreground" : ""
					}
					type="button"
					aria-label="Bold"
				>
					<Bold className="w-4 h-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={toggleItalic}
					className={
						editor.isActive("italic") ? "bg-accent text-accent-foreground" : ""
					}
					type="button"
					aria-label="Italic"
				>
					<Italic className="w-4 h-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={toggleStrike}
					className={
						editor.isActive("strike") ? "bg-accent text-accent-foreground" : ""
					}
					type="button"
					aria-label="Strikethrough"
				>
					<Strikethrough className="w-4 h-4" />
				</Button>

				<div className="w-px h-6 bg-border mx-1" />

				<Button
					variant="ghost"
					size="sm"
					onClick={() => toggleHeading(1)}
					className={
						editor.isActive("heading", { level: 1 })
							? "bg-accent text-accent-foreground"
							: ""
					}
					type="button"
					aria-label="Heading 1"
				>
					<Heading1 className="w-4 h-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => toggleHeading(2)}
					className={
						editor.isActive("heading", { level: 2 })
							? "bg-accent text-accent-foreground"
							: ""
					}
					type="button"
					aria-label="Heading 2"
				>
					<Heading2 className="w-4 h-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => toggleHeading(3)}
					className={
						editor.isActive("heading", { level: 3 })
							? "bg-accent text-accent-foreground"
							: ""
					}
					type="button"
					aria-label="Heading 3"
				>
					<Heading3 className="w-4 h-4" />
				</Button>

				<div className="w-px h-6 bg-border mx-1" />

				<Button
					variant="ghost"
					size="sm"
					onClick={toggleBulletList}
					className={
						editor.isActive("bulletList")
							? "bg-accent text-accent-foreground"
							: ""
					}
					type="button"
					aria-label="Bullet List"
				>
					<List className="w-4 h-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={toggleOrderedList}
					className={
						editor.isActive("orderedList")
							? "bg-accent text-accent-foreground"
							: ""
					}
					type="button"
					aria-label="Ordered List"
				>
					<ListOrdered className="w-4 h-4" />
				</Button>

				<div className="w-px h-6 bg-border mx-1" />

				<Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
					<DialogTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className={
								editor.isActive("link")
									? "bg-accent text-accent-foreground"
									: ""
							}
							type="button"
							aria-label="Link"
						>
							<LinkIcon className="w-4 h-4" />
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Sisipkan Tautan</DialogTitle>
						</DialogHeader>
						<Input
							id="url"
							value={linkUrl}
							onChange={(e) => setLinkUrl(e.target.value)}
							placeholder="https://example.com"
						/>
						<DialogFooter>
							<Button type="button" onClick={setLink}>
								Simpan Tautan
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Button
					variant="ghost"
					size="sm"
					onClick={unsetLink}
					disabled={!editor.isActive("link")}
					type="button"
					aria-label="Unlink"
				>
					<Unlink className="w-4 h-4" />
				</Button>

				<Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
					<DialogTrigger asChild>
						<Button variant="ghost" size="sm" type="button" aria-label="Image">
							<ImageIcon className="w-4 h-4" />
						</Button>
					</DialogTrigger>
					<DialogContent className="min-w-fit">
						<DialogHeader>
							<DialogTitle>Sisipkan Gambar / Berkas</DialogTitle>
						</DialogHeader>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Input
									id="imageFile"
									type="file"
									onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
								/>
								<div className="flex gap-2">
									<Button
										type="button"
										onClick={handleImageUpload}
										disabled={!selectedFile || isUploading}
										className="flex-1"
									>
										<ImageIcon className="w-4 h-4 mr-2" />
										{isUploading ? "Mengunggah..." : "Unggah sebagai Gambar"}
									</Button>
									<Button
										type="button"
										onClick={handleFileUpload}
										disabled={!selectedFile || isUploading}
										className="flex-1"
										variant="secondary"
									>
										<FileDown className="w-4 h-4 mr-2" />
										{isUploading ? "Mengunggah..." : "Unggah sebagai Tautan"}
									</Button>
								</div>
							</div>
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-background px-2 text-muted-foreground">
										Atau masukkan URL
									</span>
								</div>
							</div>
							<div className="grid gap-2">
								<Input
									id="imageUrl"
									value={imageUrl}
									onChange={(e) => setImageUrl(e.target.value)}
									placeholder="https://example.com/image.jpg"
								/>
								<Button
									type="button"
									onClick={addImageUrl}
									disabled={!imageUrl}
								>
									Tambah dari URL
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				<Dialog
					open={isYoutubeDialogOpen}
					onOpenChange={setIsYoutubeDialogOpen}
				>
					<DialogTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							aria-label="Video YouTube"
						>
							<Video className="w-4 h-4" />
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Sisipkan Video YouTube</DialogTitle>
						</DialogHeader>
						<Input
							id="youtubeUrl"
							value={youtubeUrl}
							onChange={(e) => setYoutubeUrl(e.target.value)}
							placeholder="https://www.youtube.com/watch?v=..."
						/>
						<DialogFooter>
							<Button
								type="button"
								onClick={addYoutubeVideo}
								disabled={!youtubeUrl}
							>
								Tambah Video
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="p-4 grow prose max-w-none dark:prose-invert focus:outline-none focus-within:ring-0 [&_.ProseMirror]:min-h-75 [&_.ProseMirror]:outline-none">
				<EditorContent editor={editor} />
			</div>
		</div>
	);
}
