import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import {
  StellaCard,
  StellaBarChart,
  StellaErrorState,
  StellaEmptyState,
  StellaFormField,
  StellaInput,
  StellaLoadingSkeleton,
  StellaMetricCard,
  StellaProgressBar,
  StellaProgressRing,
  StellaSelect,
  StellaStatusLabel,
  StellaTextarea,
  StellaTimeline
} from './StellaVisualFoundation';

test('shared visual primitives render semantic, themeable components', () => {
  const markup = renderToStaticMarkup(createElement(
    StellaCard,
    { variant: 'feature', padding: 'lg' },
    createElement(StellaMetricCard, {
      label: 'Lessons complete',
      value: '8 / 12',
      tone: 'gold'
    }),
    createElement(StellaStatusLabel, { tone: 'success', dot: true }, 'On track')
  ));

  assert.match(markup, /stella-card stella-card--feature/);
  assert.match(markup, /stella-metric--gold/);
  assert.match(markup, /aria-label="Lessons complete: 8 \/ 12"/);
  assert.match(markup, /stella-status--success/);
  assert.match(markup, /aria-hidden="true"/);
});

test('progress visualizations clamp values and expose accessible progress semantics', () => {
  const bar = renderToStaticMarkup(createElement(StellaProgressBar, {
    label: 'Course progress',
    value: 150,
    max: 100
  }));
  const ring = renderToStaticMarkup(createElement(StellaProgressRing, {
    label: 'No progress',
    value: -10
  }));

  assert.match(bar, /aria-valuenow="100"/);
  assert.match(bar, /aria-valuetext="100%"/);
  assert.match(bar, /inline-size:100%/);
  assert.match(ring, /aria-valuenow="0"/);
  assert.match(ring, /aria-valuetext="0%"/);
});

test('empty and loading states expose status while keeping decorative geometry hidden', () => {
  const empty = renderToStaticMarkup(createElement(StellaEmptyState, {
    title: 'Nothing here yet',
    description: 'Your next step will appear here.'
  }));
  const skeleton = renderToStaticMarkup(createElement(StellaLoadingSkeleton, {
    rows: 2,
    variant: 'card'
  }));

  assert.match(empty, /role="status"/);
  assert.match(empty, /Your next step will appear here/);
  assert.match(skeleton, /aria-busy="true"/);
  assert.match(skeleton, /class="stella-skeleton__block stella-skeleton__block--hero"/);
});

test('timeline and charts render directional semantic visualizations from supplied data', () => {
  const timeline = renderToStaticMarkup(createElement(StellaTimeline, {
    label: 'Upcoming events',
    dir: 'rtl',
    items: [{
      id: 'event-1',
      title: 'Sunday School',
      dateLabel: 'Sunday',
      dateTime: '2026-11-01',
      description: 'Weekly gathering',
      tone: 'gold'
    }]
  }));
  const chart = renderToStaticMarkup(createElement(StellaBarChart, {
    label: 'Learning activity by area',
    dir: 'rtl',
    formatValue: value => `${value} درس`,
    data: [
      { id: 'sunday-school', label: 'Sunday School', value: 4, tone: 'teal' },
      { id: 'hymns', label: 'Hymns', value: 2, tone: 'gold' }
    ]
  }));

  assert.match(timeline, /<ol class="stella-timeline" aria-label="Upcoming events" dir="rtl">/);
  assert.match(timeline, /<time class="stella-timeline__date" dateTime="2026-11-01">Sunday<\/time>/);
  assert.match(chart, /role="img" aria-label="Learning activity by area" dir="rtl"/);
  assert.match(chart, /stella-chart__bar--teal/);
  assert.match(chart, /inline-size:100%/);
  assert.match(chart, /2 درس/);
});

test('shared form controls associate labels and errors with accessible inputs', () => {
  const field = renderToStaticMarkup(createElement(
    StellaFormField,
    { id: 'display-name', label: 'Display name', error: 'Name is required', required: true, dir: 'rtl' },
    createElement(StellaInput, { id: 'display-name', errorId: 'display-name-error' })
  ));
  const select = renderToStaticMarkup(createElement(StellaFormField, {
    id: 'grade',
    label: 'Grade',
    hint: 'Choose the current grade.'
  }, createElement(StellaSelect, {
    id: 'grade',
    hintId: 'grade-hint',
    children: createElement('option', { value: 'primary' }, 'Primary')
  })));
  const textarea = renderToStaticMarkup(createElement(StellaTextarea, {
    id: 'notes',
    'aria-label': 'Notes'
  }));
  const error = renderToStaticMarkup(createElement(StellaErrorState, {
    title: 'Could not load',
    description: 'Please retry.',
    dir: 'rtl'
  }));

  assert.match(field, /<label class="stella-field__label" for="display-name">Display name/);
  assert.match(field, /aria-invalid="true"/);
  assert.match(field, /id="display-name-error" role="alert"/);
  assert.match(select, /aria-describedby="grade-hint"/);
  assert.match(select, /stella-select__icon/);
  assert.match(textarea, /stella-field__control--multiline/);
  assert.match(error, /role="alert" dir="rtl"/);
});
