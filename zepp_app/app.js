import { BaseApp } from '@zeppos/zml/base-app'

// BaseApp is required: it creates the messaging transport and the file
// transfer library that BasePage (used by page/import) reads from
// globalData. Without it, pages that use BasePage fail in onInit.
App(
  BaseApp({
    globalData: {
      // Index of the saved routine to run when requested from the saved list.
      // -1 means none.
      runIndex: -1,
    },
    onCreate() {},
    onDestroy() {},
  }),
)
