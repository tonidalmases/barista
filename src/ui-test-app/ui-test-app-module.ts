import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { UIApp, Home } from './ui-test-app/ui-test-app';
import { UI_TEST_APP_ROUTES } from './ui-test-app/routes';
import { DtButtonModule } from '@dynatrace/angular-components/button';
import { DtButtonGroupModule } from '@dynatrace/angular-components/button-group';
import { DtCopyToClipboardModule } from '@dynatrace/angular-components/copy-to-clipboard';
import { DtCheckboxModule } from '@dynatrace/angular-components/checkbox';
import { DtExpandableSectionModule } from '@dynatrace/angular-components/expandable-section';
import { DtExpandablePanelModule } from '@dynatrace/angular-components/expandable-panel';
import { DtTileModule } from '@dynatrace/angular-components/tile';
import { DtContextDialogModule } from '@dynatrace/angular-components/context-dialog';
import { DtKeyValueListModule } from '@dynatrace/angular-components/key-value-list';
import { DtPaginationModule } from '@dynatrace/angular-components/pagination';
import { DtIconModule } from '@dynatrace/angular-components/icon';
import { DtRadioModule } from '@dynatrace/angular-components/radio';
import { DtShowMoreModule } from '@dynatrace/angular-components/show-more';
import { DtSwitchModule } from '@dynatrace/angular-components/switch';
import { ButtonUI } from './button/button-ui';
import { ButtonGroupUi } from './button-group/button-group-ui';
import { ExpandableSectionUi } from './expandable-section/expandable-section-ui';
import { ExpandablePanelUi } from './expandable-panel/expandable-panel-ui';
import { TileUI } from './tile/tile-ui';
import { ContextDialogUI } from './context-dialog/context-dialog-ui';
import { KeyValueListUI } from './key-value-list/key-value-list-ui';
import { CopyToClipboardUI } from './copy-to-clipboard/copy-to-clipboard-ui';
import { PaginationUI } from './pagination/pagination-ui';
import { RadioUI } from './radio/radio.ui';
import { HttpClientModule } from '@angular/common/http';
import { ShowMoreUI } from './show-more/show-more-ui';
import { CheckboxUI } from './checkbox/checkbox-ui';
import { SwitchUI } from './switch/switch-ui';
import {DtInputModule} from '@dynatrace/angular-components/input';

/**
 * NgModule that contains all lib modules that are required to serve the ui-test-app.
 */
@NgModule({
  exports: [
    DtButtonModule,
    DtButtonGroupModule,
    DtInputModule,
    DtCopyToClipboardModule,
    DtCheckboxModule,
    DtExpandablePanelModule,
    DtExpandableSectionModule,
    DtTileModule,
    DtContextDialogModule,
    DtPaginationModule,
    DtRadioModule,
    DtShowMoreModule,
    DtKeyValueListModule,
    DtSwitchModule,
  ],
})
export class DynatraceAngularCompModule {}

@NgModule({
  imports: [
    BrowserModule,
    RouterModule.forRoot(UI_TEST_APP_ROUTES),
    DynatraceAngularCompModule,
    NoopAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
    DtIconModule.forRoot({svgIconLocation: '/lib/assets/icons/{{name}}.svg'}),
  ],
  declarations: [
    UIApp,
    Home,
    ButtonUI,
    ButtonGroupUi,
    CheckboxUI,
    ExpandablePanelUi,
    ExpandableSectionUi,
    RadioUI,
    TileUI,
    ContextDialogUI,
    CopyToClipboardUI,
    KeyValueListUI,
    PaginationUI,
    ShowMoreUI,
    SwitchUI,
  ],
  bootstrap: [UIApp],
})
export class UiTestAppModule { }
