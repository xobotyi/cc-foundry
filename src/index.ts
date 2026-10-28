#!/usr/bin/env node
import {runMain} from 'citty';
import root from './command/index.ts';

await runMain(root);
