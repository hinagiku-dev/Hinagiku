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

	type GroupWithId = Group & {
		id: string;
		updatedAt: Timestamp | undefined;
	};

	type ParticipantProgress = {
		displayName: string;
		progress: number;
		completedTasks: boolean[];
		warning: {
			moderation: boolean;
			offTopic: number;
		};
	};

	interface TranscriptExporterProps {
		session: Session | undefined;
		selectedParticipants: Set<string>;
		selectedGroups: Set<string>;
		conversationsMap: SvelteMap<string, Conversation>;
		groupsMap: SvelteMap<string, GroupWithId>;
		participantProgress: SvelteMap<string, ParticipantProgress>;
		onSelectionChange: (participants: Set<string>, groups: Set<string>) => void;
		exportFormat: 'pdf' | 'docx';
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

	let isExporting = $state(false);

	async function createChinesePDF(htmlContent: string): Promise<jsPDF> {
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = htmlContent;
		tempDiv.style.position = 'absolute';
		tempDiv.style.left = '-9999px';
		tempDiv.style.top = '-9999px';
		tempDiv.style.width = '800px';
		tempDiv.style.padding = '20px';
		tempDiv.style.fontFamily = 'Arial, "Microsoft YaHei", "Helvetica Neue", sans-serif';
		tempDiv.style.fontSize = '14px';
		tempDiv.style.lineHeight = '1.6';
		tempDiv.style.color = '#000';
		tempDiv.style.backgroundColor = '#fff';

		document.body.appendChild(tempDiv);

		try {
			const canvas = await html2canvas(tempDiv, {
				scale: 2,
				useCORS: true,
				allowTaint: true,
				backgroundColor: '#ffffff'
			});

			const pdf = new jsPDF('p', 'mm', 'a4');
			const imgWidth = 210;
			const pageHeight = 295;
			const imgHeight = (canvas.height * imgWidth) / canvas.width;
			let heightLeft = imgHeight;

			const imgData = canvas.toDataURL('image/png');
			let position = 0;

			pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
			heightLeft -= pageHeight;

			while (heightLeft >= 0) {
				position = heightLeft - imgHeight;
				pdf.addPage();
				pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
				heightLeft -= pageHeight;
			}

			return pdf;
		} finally {
			document.body.removeChild(tempDiv);
		}
	}

	function createTranscriptHTMLTemplate(
		title: string,
		sessionTitle: string,
		metaInfo: Array<{ label: string; value: string }>,
		taskContent: string,
		contentSectionTitle: string,
		contentHTML: string
	): string {
		const metaInfoHTML = metaInfo
			.map((info) => `<p><strong>${info.label}:</strong> ${info.value}</p>`)
			.join('');

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
