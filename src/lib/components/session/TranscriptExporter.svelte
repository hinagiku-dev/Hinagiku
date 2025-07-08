<!--
  @fileoverview
  TranscriptExporter Component - Handles export of learning session transcripts to PDF and DOCX formats.
  
  This component provides comprehensive export functionality for educational session data including:
  - Individual student conversation transcripts
  - Group discussion records
  - Session metadata and learning progress
  - Multi-format support (PDF via html2canvas, DOCX via docx library)
  - Bulk export capabilities with ZIP packaging
  - Internationalization support for both English and Traditional Chinese
  
  Key Features:
  - Selective export: Choose specific participants and groups
  - Format flexibility: PDF (image-based) or DOCX (structured document)
  - Progress tracking: Shows completion status and warnings
  - Localized content: Adapts to current language settings
  - Batch processing: Handles multiple transcripts efficiently
-->

<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { notifications } from '$lib/stores/notifications';
	import type { Session } from '$lib/schema/session';
	import type { Group } from '$lib/schema/group';
	import type { Conversation } from '$lib/schema/conversation';
	import { SvelteMap } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import jsPDF from 'jspdf';
	import JSZip from 'jszip';
	import html2canvas from 'html2canvas';
	import { Timestamp } from 'firebase/firestore';
	import { Document, Packer, Paragraph, TextRun } from 'docx';

	// Type definitions for component data structures

	/**
	 * Extended Group type that includes Firestore document metadata
	 * for proper handling of database-sourced group data
	 */
	type GroupWithId = Group & {
		id: string;
		updatedAt: Timestamp | undefined;
	};

	/**
	 * Participant learning progress summary including completion status and warnings
	 * Used for displaying educational advancement and potential issues
	 */
	type ParticipantProgress = {
		displayName: string; // Human-readable participant name
		progress: number; // Overall completion percentage (0-100)
		completedTasks: boolean[]; // Per-subtask completion status
		warning: {
			moderation: boolean; // Flag for inappropriate content
			offTopic: number; // Count of off-topic instances
		};
	};

	/**
	 * Component props interface defining all required data and callbacks
	 * for transcript export functionality
	 */
	interface TranscriptExporterProps {
		session: Session | undefined; // Current learning session data
		selectedParticipants: Set<string>; // User-selected participants for export
		selectedGroups: Set<string>; // User-selected groups for export
		conversationsMap: SvelteMap<string, Conversation>; // Individual chat records
		groupsMap: SvelteMap<string, GroupWithId>; // Group discussion records
		participantProgress: SvelteMap<string, ParticipantProgress>; // Learning progress data
		onSelectionChange: (participants: Set<string>, groups: Set<string>) => void; // Selection update callback
		exportFormat: 'pdf' | 'docx'; // Desired output format
	}

	let {
		session,
		selectedParticipants,
		selectedGroups,
		conversationsMap,
		groupsMap,
		participantProgress,
		onSelectionChange,
		exportFormat
	}: TranscriptExporterProps = $props();

	// Component state for tracking export operations
	let isExporting = $state(false);

	/**
	 * Creates a PDF document from HTML content with proper Chinese font support.
	 *
	 * This function addresses the challenge of rendering Chinese text in PDFs by:
	 * 1. Creating a temporary DOM element with proper Chinese font styling
	 * 2. Using html2canvas to capture the content as an image
	 * 3. Converting the image to PDF format with appropriate scaling
	 * 4. Handling multi-page content by calculating page breaks
	 *
	 * @param htmlContent - HTML string containing the transcript content
	 * @returns Promise resolving to a jsPDF document ready for download
	 */
	async function createChinesePDF(htmlContent: string): Promise<jsPDF> {
		// Create temporary DOM element for rendering with Chinese font support
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = htmlContent;

		// Position element off-screen to avoid visual interference
		tempDiv.style.position = 'absolute';
		tempDiv.style.left = '-9999px';
		tempDiv.style.top = '-9999px';

		// Set fixed width and styling for consistent rendering
		tempDiv.style.width = '800px';
		tempDiv.style.padding = '20px';
		tempDiv.style.fontFamily = 'Arial, "Microsoft YaHei", "Helvetica Neue", sans-serif';
		tempDiv.style.fontSize = '14px';
		tempDiv.style.lineHeight = '1.6';
		tempDiv.style.color = '#000';
		tempDiv.style.backgroundColor = '#fff';

		document.body.appendChild(tempDiv);

		try {
			// Capture content as high-resolution image for quality output
			const canvas = await html2canvas(tempDiv, {
				scale: 2, // High DPI for crisp text
				useCORS: true, // Allow cross-origin resources
				allowTaint: true, // Permit tainted canvas for flexibility
				backgroundColor: '#ffffff' // Ensure white background
			});

			// Initialize PDF with A4 dimensions in portrait orientation
			const pdf = new jsPDF('p', 'mm', 'a4');
			const imgWidth = 210; // A4 width in mm
			const pageHeight = 295; // A4 height in mm (minus margins)
			const imgHeight = (canvas.height * imgWidth) / canvas.width;
			let heightLeft = imgHeight;

			const imgData = canvas.toDataURL('image/png');
			let position = 0;

			// Add first page with full image
			pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
			heightLeft -= pageHeight;

			// Handle content that exceeds single page by adding additional pages
			while (heightLeft >= 0) {
				position = heightLeft - imgHeight; // Calculate offset for next page
				pdf.addPage();
				pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
				heightLeft -= pageHeight;
			}

			return pdf;
		} finally {
			// Clean up temporary DOM element to prevent memory leaks
			document.body.removeChild(tempDiv);
		}
	}

	/**
	 * Generates a standardized HTML template for transcript documents.
	 *
	 * Creates consistent formatting for all exported transcripts including:
	 * - Document header with title and session information
	 * - Metadata section with participant/group details
	 * - Task description and objectives
	 * - Main content area for conversations/discussions
	 * - Footer with generation timestamp
	 *
	 * @param title - Document title (e.g., "Individual Transcript", "Group Transcript")
	 * @param sessionTitle - Name of the learning session
	 * @param metaInfo - Array of label-value pairs for document metadata
	 * @param taskContent - Learning task description and objectives
	 * @param contentSectionTitle - Title for the main content section
	 * @param contentHTML - HTML content of conversations/discussions
	 * @returns Complete HTML document string ready for PDF conversion
	 */
	function createTranscriptHTMLTemplate(
		title: string,
		sessionTitle: string,
		metaInfo: Array<{ label: string; value: string }>,
		taskContent: string,
		contentSectionTitle: string,
		contentHTML: string
	): string {
		// Format metadata as HTML list
		const metaInfoHTML = metaInfo
			.map((info) => `<p><strong>${info.label}:</strong> ${info.value}</p>`)
			.join('');

		// Generate localized timestamp for document footer
		const currentLang = languageTag();
		const locale = currentLang === 'zh' ? 'zh-TW' : 'en-US';
		const generatedTime = new Date().toLocaleString(locale);

		return `
			<div class="transcript-container">
				<h1 class="transcript-title">${title}</h1>
				
				<div class="transcript-meta">
					<p><strong>${m.pdfSession()}:</strong> ${sessionTitle}</p>
					${metaInfoHTML}
					<p><strong>${m.pdfGeneratedTime()}:</strong> ${generatedTime}</p>
				</div>

				<div class="transcript-task">
					<h2 class="transcript-section-title">${m.pdfTaskContent()}:</h2>
					<p class="transcript-task-content">${taskContent}</p>
				</div>

				<div class="transcript-content">
					<h2 class="transcript-section-title">${contentSectionTitle}:</h2>
					${contentHTML}
				</div>
			</div>
		`;
	}

	function createMessageHTML(speaker: string, content: string): string {
		return `
			<div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #ccc;">
				<p style="margin: 0 0 5px 0; font-weight: bold; color: #333;">${speaker}:</p>
				<p style="margin: 0; line-height: 1.6;">${content || ''}</p>
			</div>
		`;
	}

	async function createPersonalTranscriptPDF(
		sessionTitle: string,
		userName: string,
		conversation: Conversation,
		session: Session | undefined
	): Promise<jsPDF> {
		const metaInfo = [{ label: m.pdfStudent(), value: userName }];

		const conversationHTML =
			conversation.history
				?.map((message) => {
					const speaker = message.role === 'user' ? userName : m.pdfAISpeaker();
					return createMessageHTML(speaker, message.content || '');
				})
				.join('') || `<p>${m.pdfNoConversationRecord()}</p>`;

		const htmlContent = createTranscriptHTMLTemplate(
			m.pdfPersonalTranscriptTitle(),
			sessionTitle,
			metaInfo,
			session?.task || m.pdfNoTaskDescription(),
			m.pdfConversationContent(),
			conversationHTML
		);

		return await createChinesePDF(htmlContent);
	}

	async function createGroupTranscriptPDF(
		sessionTitle: string,
		group: GroupWithId,
		session: Session | undefined
	): Promise<jsPDF> {
		const metaInfo = [
			{ label: m.pdfGroup(), value: m.pdfGroupNumber({ number: group.number }) },
			{
				label: m.pdfMemberCount(),
				value: m.pdfMemberCountValue({ count: group.participants.length })
			}
		];

		const discussionHTML =
			(group.discussions || [])
				.map((discussion) => {
					const speaker = discussion.speaker || m.pdfUnknownSpeaker();
					const content = discussion.content || '';
					return createMessageHTML(speaker, content);
				})
				.join('') || `<p>${m.pdfNoDiscussionRecord()}</p>`;

		const htmlContent = createTranscriptHTMLTemplate(
			m.pdfGroupTranscriptTitle(),
			sessionTitle,
			metaInfo,
			session?.task || m.pdfNoTaskDescription(),
			m.pdfDiscussionContent(),
			discussionHTML
		);

		return await createChinesePDF(htmlContent);
	}

	function selectAllParticipants() {
		const allParticipants = new Set(Array.from(participantProgress.keys()));
		onSelectionChange(allParticipants, selectedGroups);
	}

	function selectAllGroups() {
		const allGroups = new Set(Array.from(groupsMap.keys()));
		onSelectionChange(selectedParticipants, allGroups);
	}

	function deselectAll() {
		onSelectionChange(new Set(), new Set());
	}

	// 產生 DOCX 檔案
	function createPersonalTranscriptDocx(
		sessionTitle: string,
		userName: string,
		conversation: Conversation,
		session: Session | undefined
	): Document {
		const metaInfo = [`${m.pdfStudent()}: ${userName}`];
		const taskContent = session?.task || m.pdfNoTaskDescription();
		const children = [
			new Paragraph({
				text: m.pdfPersonalTranscriptTitle(),
				heading: 'Heading1',
				spacing: { after: 200 }
			}),
			new Paragraph({
				children: [new TextRun({ text: `${m.pdfSession()}: ${sessionTitle}`, bold: true })],
				spacing: { after: 100 }
			}),
			...metaInfo.map((info) => new Paragraph({ text: info, spacing: { after: 100 } })),
			new Paragraph({
				children: [
					new TextRun({ text: `${m.pdfTaskContent()}: `, bold: true }),
					new TextRun(taskContent)
				],
				spacing: { after: 200 }
			}),
			new Paragraph({
				children: [new TextRun({ text: m.pdfConversationContent() + ':', bold: true })],
				spacing: { after: 100 }
			}),
			// 對話內容
			...(conversation.history?.map(
				(message) =>
					new Paragraph({
						children: [
							new TextRun({
								text: `${message.role === 'user' ? userName : m.pdfAISpeaker()}: `,
								bold: true,
								color: '2E74B5'
							}),
							new TextRun({ text: message.content || '', break: 1 })
						],
						spacing: { after: 120 },
						border: { left: { color: 'CCCCCC', space: 1, size: 6, style: 'single' } }
					})
			) || [new Paragraph(m.pdfNoConversationRecord())])
		];
		return new Document({
			sections: [{ children }]
		});
	}

	function createGroupTranscriptDocx(
		sessionTitle: string,
		group: GroupWithId,
		session: Session | undefined
	): Document {
		const metaInfo = [
			`${m.pdfGroup()}: ${m.pdfGroupNumber({ number: group.number })}`,
			`${m.pdfMemberCount()}: ${m.pdfMemberCountValue({ count: group.participants.length })}`
		];
		const taskContent = session?.task || m.pdfNoTaskDescription();
		const children = [
			new Paragraph({
				text: m.pdfGroupTranscriptTitle(),
				heading: 'Heading1',
				spacing: { after: 200 }
			}),
			new Paragraph({
				children: [new TextRun({ text: `${m.pdfSession()}: ${sessionTitle}`, bold: true })],
				spacing: { after: 100 }
			}),
			...metaInfo.map((info) => new Paragraph({ text: info, spacing: { after: 100 } })),
			new Paragraph({
				children: [
					new TextRun({ text: `${m.pdfTaskContent()}: `, bold: true }),
					new TextRun(taskContent)
				],
				spacing: { after: 200 }
			}),
			new Paragraph({
				children: [new TextRun({ text: m.pdfDiscussionContent() + ':', bold: true })],
				spacing: { after: 100 }
			}),
			// 討論內容
			...(group.discussions && group.discussions.length > 0
				? group.discussions.map(
						(discussion) =>
							new Paragraph({
								children: [
									new TextRun({
										text: `${discussion.speaker || m.pdfUnknownSpeaker()}: `,
										bold: true,
										color: '2E74B5'
									}),
									new TextRun({ text: discussion.content || '', break: 1 })
								],
								spacing: { after: 120 },
								border: { left: { color: 'CCCCCC', space: 1, size: 6, style: 'single' } }
							})
					)
				: [new Paragraph(m.pdfNoDiscussionRecord())])
		];
		return new Document({
			sections: [{ children }]
		});
	}

	async function exportSelectedTranscripts() {
		if (selectedParticipants.size === 0 && selectedGroups.size === 0) {
			notifications.warning(m.exportSelectAtLeastOne());
			return;
		}

		try {
			isExporting = true;
			notifications.info(exportFormat === 'pdf' ? m.exportGeneratingPDF() : '產生 DOCX 中...');

			const zip = new JSZip();
			const sessionTitle = session?.title || 'Session';

			if (exportFormat === 'pdf') {
				// 處理個人參與者匯出（僅個人階段對話）
				const participantPromises = Array.from(selectedParticipants).map(async (participantId) => {
					const conversation = conversationsMap.get(participantId);
					const participantData = participantProgress.get(participantId);

					if (conversation && participantData) {
						const pdf = await createPersonalTranscriptPDF(
							sessionTitle,
							participantData.displayName,
							conversation,
							session
						);

						const filename = m.pdfPersonalTranscriptFilename({ name: participantData.displayName });
						zip.file(filename, pdf.output('arraybuffer'));
					}
				});

				// 等待所有個人 PDF 完成
				await Promise.all(participantPromises);

				// 處理小組匯出（僅小組討論階段）
				for (const groupId of selectedGroups) {
					const group = groupsMap.get(groupId);

					if (group) {
						const pdf = await createGroupTranscriptPDF(sessionTitle, group, session);

						const filename = m.pdfGroupTranscriptFilename({ number: group.number });
						zip.file(filename, pdf.output('arraybuffer'));
					}
				}
			} else {
				// DOCX 處理
				for (const participantId of selectedParticipants) {
					const conversation = conversationsMap.get(participantId);
					const participantData = participantProgress.get(participantId);
					if (conversation && participantData) {
						const doc = createPersonalTranscriptDocx(
							sessionTitle,
							participantData.displayName,
							conversation,
							session
						);
						const buffer = await Packer.toBlob(doc);
						const filename = `${participantData.displayName}.docx`;
						zip.file(filename, buffer);
					}
				}
				for (const groupId of selectedGroups) {
					const group = groupsMap.get(groupId);
					if (group) {
						const doc = createGroupTranscriptDocx(sessionTitle, group, session);
						const buffer = await Packer.toBlob(doc);
						const filename = `${m.pdfGroupTranscriptFilename({ number: group.number }).replace(/\.pdf$/, '.docx')}`;
						zip.file(filename, buffer);
					}
				}
			}

			// 生成並下載 ZIP 檔案
			const zipBlob = await zip.generateAsync({ type: 'blob' });
			const url = window.URL.createObjectURL(zipBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `session-${sessionTitle}-${new Date().toISOString().split('T')[0]}.zip`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			notifications.success(m.exportCompleted());
			onSelectionChange(new Set(), new Set());
		} catch (error) {
			console.error('匯出失敗:', error);
			notifications.error(error instanceof Error ? error.message : m.exportFailed());
		} finally {
			isExporting = false;
		}
	}
</script>

<div class="rounded-lg border bg-gray-50 p-4">
	<h3 class="mb-3 text-lg font-semibold">{m.exportTranscriptTitle()}</h3>
	<div class="mb-4 flex gap-2">
		<Button color="light" size="sm" onclick={selectAllParticipants}>
			{m.selectAllParticipants()}
		</Button>
		<Button color="light" size="sm" onclick={selectAllGroups}>
			{m.selectAllGroups()}
		</Button>
		<Button color="red" outline size="sm" onclick={deselectAll}>
			{m.deselectAll()}
		</Button>
		<Button
			color="green"
			size="sm"
			onclick={exportSelectedTranscripts}
			disabled={isExporting ||
				(Array.from(selectedParticipants).length === 0 && Array.from(selectedGroups).length === 0)}
		>
			{#if isExporting}
				{m.exporting()}
			{:else}
				{m.exportSelected()}
			{/if}
		</Button>
	</div>
	<p class="text-sm text-gray-600">
		{m.selectedCount({
			participants: Array.from(selectedParticipants).length,
			groups: Array.from(selectedGroups).length
		})}
	</p>
	<div class="mt-2 space-y-1 text-xs text-gray-500">
		<p>{m.exportParticipantDesc()}</p>
		<p>{m.exportGroupDesc()}</p>
	</div>
</div>
