import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { IPC_CHANNELS } from '../../shared/types'
import { ChapterRepository } from '../services/database/repositories/chapter.repository'
import { formatChaptersForExport, getFileExtension, getFileFilter } from '../services/export-service'
import type { ExportOptions } from '../../shared/types'

const chapterRepo = new ChapterRepository()

export function registerExportIPC(): void {
  ipcMain.handle(
    IPC_CHANNELS.EXPORT_FILE,
    async (event, projectId: number, options: ExportOptions) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) return { success: false, error: 'No window' }

        const chapters = chapterRepo.findByProjectId(projectId)
        let selectedChapters = chapters

        if (options.scope === 'selected' && options.chapterIds) {
          selectedChapters = chapters.filter((c) => options.chapterIds!.includes(c.id))
        } else if (options.scope === 'current' && options.chapterIds?.length) {
          selectedChapters = chapters.filter((c) => c.id === options.chapterIds![0])
        }

        const output = formatChaptersForExport(selectedChapters, options)

        const ext = getFileExtension(options.format)
        const filter = getFileFilter(options.format)
        const result = await dialog.showSaveDialog(win, {
          defaultPath: `export.${ext}`,
          filters: [filter]
        })

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Cancelled' }
        }

        writeFileSync(result.filePath, output, 'utf-8')
        return { success: true, filePath: result.filePath }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )
}
