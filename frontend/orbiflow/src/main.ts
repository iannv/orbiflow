// Copyright (C) 2026 OrbiCoop Cooperativa de Trabajo Ltda.
// 
// OrbiFlow es software libre: podés redistribuirlo y/o modificarlo 
// bajo los términos de la Licencia Pública General Affero de GNU tal 
// como fue publicada por la Free Software Foundation.

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
  