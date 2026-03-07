import type { TextBlock, PageModel } from '../../types/document'
import type { IFontManager } from './IFontManager'

export interface ILayoutEngine {
  reflowTextBlock(block: TextBlock, fontManager: IFontManager, options?: { autoGrow?: boolean }): TextBlock;
  reflowPage(page: PageModel, fontManager: IFontManager): PageModel;
  setStrategy(strategy: 'greedy' | 'knuth-plass'): void;
  getStrategy(): 'greedy' | 'knuth-plass';
}
