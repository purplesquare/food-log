const STORAGE_KEY = 'health-journal-events-v1';

const DRINKS = [
  { name: 'Water', emoji: '💧', defaultQuantityMl: 250 },
  { name: 'Black Tea', emoji: '☕', defaultQuantityMl: 300 },
  { name: 'Rooibos', emoji: '🫖', defaultQuantityMl: 300 },
  { name: 'Coffee', emoji: '☕', defaultQuantityMl: 250 },
];

const VIEWS = {
  all: {
    title: 'Timeline',
    empty: 'No entries yet. Add a meal, drink, symptom, or check-in to start your journal.',
  },
  meal: {
    title: 'Meals',
    empty: 'No meals logged for this day yet.',
  },
  drink: {
    title: 'Drinks',
    empty: 'No drinks logged for this day yet.',
  },
  symptom: {
    title: 'Symptoms',
    empty: 'No symptoms logged for this day yet.',
  },
};

const FORM_COPY = {
  meal: {
    heading: 'Add meal',
    titleLabel: 'Other meal name',
    placeholder: 'Brunch, late snack, post-run meal…',
    notes: 'What did you eat?',
  },
  drink: {
    heading: 'Add drink',
    titleLabel: 'Drink',
    placeholder: '',
    notes: 'Anything useful? Strength, milk, sugar, time with food, or how you felt afterwards.',
  },
  symptom: {
    heading: 'Log symptom',
    titleLabel: 'Symptom',
    placeholder: 'Bloating, sluggishness, brain fog, reflux…',
    notes: 'What does it feel like? Where is it? What were you doing beforehand?',
  },
  checkin: {
    heading: 'Daily check-in',
    titleLabel: 'Check-in title',
    placeholder: 'Overall wellbeing, sleep, stress…',
    notes: 'How are you feeling today? Sleep, stress, energy, mood, bowel notes, or reflections.',
  },
};

const ICONS = {
  meal: '🍽',
  drink: '🥤',
  symptom: '😊',
  checkin: '📝',
};

const state = {
  date: today(),
  entryType: 'meal',
  selectedDrink: DRINKS[0],
  currentView: 'all',
};

const els = collectElements();

init();

function collectElements() {
  const qs = (selector) => document.querySelector(selector);
  const qsa = (selector) => [...document.querySelectorAll(selector)];

  return {
    date: qs('#journal-date'),
    mealSummary: qs('#meal-summary'),
    drinkSummary: qs('#drink-summary'),
    symptomSummary: qs('#symptom-summary'),
    summaryCards: qsa('[data-filter]'),
    formPanel: qs('#form-panel'),
    formTitle: qs('#form-title'),
    closeForm: qs('#close-form'),
    entryForm: qs('#entry-form'),
    entryType: qs('#entry-type'),
    entryTime: qs('#entry-time'),
    entryTitle: qs('#entry-title'),
    titleLabel: qs('#title-label'),
    titleFields: qs('#title-fields'),
    mealFields: qs('#meal-fields'),
    mealName: qs('#meal-name'),
    entryDetails: qs('#entry-details'),
    drinkFields: qs('#drink-fields'),
    drinkOptions: qs('#drink-options'),
    quantityMl: qs('#quantity-ml'),
    ratingFields: qs('#rating-fields'),
    entryRating: qs('#entry-rating'),
    ratingValue: qs('#rating-value'),
    formError: qs('#form-error'),
    timelineTitle: qs('#timeline-title'),
    showAll: qs('#show-all'),
    timeline: qs('#timeline'),
    template: qs('#event-template'),
    openButtons: qsa('[data-open-form]'),
  };
}

function init() {
  els.date.value = state.date;
  els.entryTime.value = currentTime();

  els.openButtons.forEach((button) => {
    button.addEventListener('click', () => openForm(button.dataset.openForm));
  });

  els.summaryCards.forEach((card) => {
    card.addEventListener('click', () => setView(card.dataset.filter));
  });

  els.showAll.addEventListener('click', () => setView('all'));
  els.closeForm.addEventListener('click', closeForm);
  els.date.addEventListener('change', () => {
    state.date = els.date.value || today();
    renderApp();
  });

  els.mealName.addEventListener('change', updateMealTitleVisibility);
  els.entryRating.addEventListener('input', () => {
    els.ratingValue.textContent = els.entryRating.value;
  });
  els.entryForm.addEventListener('submit', saveEntry);

  renderDrinkButtons();
  renderApp();
}

function readEvents() {
  try {
    const events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
  }
}

function writeEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function getEventsForSelectedDate() {
  return readEvents()
    .filter((event) => event.eventDate === state.date)
    .sort((a, b) => a.eventTime.localeCompare(b.eventTime) || a.id - b.id);
}

function addEvent(entry) {
  writeEvents([...readEvents(), entry]);
}

function deleteEvent(id) {
  writeEvents(readEvents().filter((event) => event.id !== id));
}

function renderApp() {
  const events = getEventsForSelectedDate();
  renderSummaries(events);
  renderTimeline(events);
}

function renderSummaries(events) {
  const summary = buildSummary(events);

  els.mealSummary.textContent = summary.meals.length ? compactList(summary.meals) : 'No meals yet';

  els.drinkSummary.textContent = summary.drinks.length
    ? summary.drinks.map((drink) => `${drink.title}: ${formatMl(drink.quantityMl)}`).join(' · ')
    : 'No drinks yet';

  els.symptomSummary.textContent = summary.symptoms.length
    ? summary.symptoms.map((symptom) => `${symptom.title}: ${symptom.highestRating}/10`).join(' · ')
    : 'Nothing logged';
}

function buildSummary(events) {
  const meals = [];
  const drinkMap = new Map();
  const symptomMap = new Map();

  events.forEach((event) => {
    if (event.eventType === 'meal') {
      meals.push(event.title);
    }

    if (event.eventType === 'drink') {
      drinkMap.set(event.title, (drinkMap.get(event.title) || 0) + Number(event.quantityMl || 0));
    }

    if (event.eventType === 'symptom') {
      symptomMap.set(event.title, Math.max(symptomMap.get(event.title) || 0, Number(event.rating || 0)));
    }
  });

  return {
    meals,
    drinks: [...drinkMap.entries()].map(([title, quantityMl]) => ({ title, quantityMl })),
    symptoms: [...symptomMap.entries()].map(([title, highestRating]) => ({ title, highestRating })),
  };
}

function renderDrinkButtons() {
  els.drinkOptions.innerHTML = '';

  DRINKS.forEach((drink) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-button';
    button.dataset.drink = drink.name;
    button.textContent = `${drink.emoji} ${drink.name}`;
    button.addEventListener('click', () => selectDrink(drink));
    els.drinkOptions.append(button);
  });
}

function selectDrink(drink) {
  state.selectedDrink = drink;
  els.quantityMl.value = drink.defaultQuantityMl;

  [...els.drinkOptions.children].forEach((button) => {
    button.classList.toggle('selected', button.dataset.drink === drink.name);
  });
}

function setView(view) {
  state.currentView = view || 'all';
  renderApp();
  els.timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTimeline(events) {
  const view = VIEWS[state.currentView] || VIEWS.all;
  const visibleEvents = state.currentView === 'all'
    ? events
    : events.filter((event) => event.eventType === state.currentView);

  els.timelineTitle.textContent = view.title;
  els.showAll.classList.toggle('hidden', state.currentView === 'all');

  els.summaryCards.forEach((card) => {
    card.classList.toggle('selected-summary', card.dataset.filter === state.currentView);
  });

  els.timeline.innerHTML = '';

  if (!visibleEvents.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = view.empty;
    els.timeline.append(empty);
    return;
  }

  visibleEvents.forEach((event) => {
    els.timeline.append(createTimelineItem(event));
  });
}

function createTimelineItem(event) {
  const node = els.template.content.cloneNode(true);
  const article = node.querySelector('.timeline-item');
  const time = node.querySelector('.timeline-time');
  const title = node.querySelector('h3');
  const meta = node.querySelector('.timeline-meta');
  const details = node.querySelector('.timeline-details');
  const deleteButton = node.querySelector('.delete-button');

  time.textContent = event.eventTime;
  title.textContent = formatEventTitle(event);
  meta.textContent = describeMeta(event);
  details.textContent = event.details || '';
  details.hidden = !event.details;
  article.dataset.eventId = event.id;

  deleteButton.addEventListener('click', () => {
    if (!window.confirm('Delete this journal entry?')) return;
    deleteEvent(event.id);
    renderApp();
  });

  return node;
}

function formatEventTitle(event) {
  if (state.currentView === 'drink' && event.eventType === 'drink') {
    return `${ICONS.drink} ${event.title}${event.quantityMl ? ` · ${formatMl(event.quantityMl)}` : ''}`;
  }

  if (state.currentView === 'symptom' && event.eventType === 'symptom') {
    return `${ICONS.symptom} ${event.title}${event.rating !== null && event.rating !== undefined ? ` · ${event.rating}/10` : ''}`;
  }

  return `${ICONS[event.eventType] || '•'} ${event.title}`;
}

function describeMeta(event) {
  if (state.currentView !== 'all') {
    if (event.eventType === 'meal') return event.details ? 'What you ate' : 'Meal';
    if (event.eventType === 'drink') return 'Drink';
    if (event.eventType === 'symptom') return 'Symptom';
  }

  const pieces = [labelForType(event.eventType)];
  if (event.quantityMl) pieces.push(formatMl(event.quantityMl));
  if (event.rating !== null && event.rating !== undefined) pieces.push(`${event.rating}/10`);
  return pieces.join(' · ');
}

function openForm(type) {
  state.entryType = type;
  els.entryForm.reset();
  els.formError.textContent = '';
  els.entryType.value = type;
  els.entryTime.value = currentTime();
  els.entryRating.value = '5';
  els.ratingValue.textContent = '5';

  const copy = FORM_COPY[type];
  els.formTitle.textContent = copy.heading;
  els.titleLabel.textContent = copy.titleLabel;
  els.entryTitle.placeholder = copy.placeholder;
  els.entryDetails.placeholder = copy.notes;

  els.mealFields.classList.toggle('hidden', type !== 'meal');
  els.drinkFields.classList.toggle('hidden', type !== 'drink');
  els.ratingFields.classList.toggle('hidden', !['symptom', 'checkin'].includes(type));
  els.titleFields.classList.toggle('hidden', type === 'meal' || type === 'drink');

  if (type === 'drink') {
    selectDrink(DRINKS[0]);
  }

  if (type === 'meal') {
    els.mealName.value = 'Breakfast';
    updateMealTitleVisibility();
  }

  if (type === 'checkin') {
    els.entryTitle.value = 'Daily wellbeing';
  }

  els.formPanel.classList.remove('hidden');
  els.entryTime.focus({ preventScroll: true });
  els.formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateMealTitleVisibility() {
  const isOther = els.mealName.value === 'Other';
  els.titleFields.classList.toggle('hidden', !isOther);
  if (!isOther) {
    els.entryTitle.value = '';
  }
}

function closeForm() {
  els.formPanel.classList.add('hidden');
}

function saveEntry(event) {
  event.preventDefault();
  els.formError.textContent = '';

  const entry = buildEntryFromForm();

  if (!entry.title) {
    els.formError.textContent = 'Add a title before saving.';
    return;
  }

  addEvent(entry);
  closeForm();
  renderApp();
}

function buildEntryFromForm() {
  const entry = {
    id: Date.now(),
    eventDate: state.date,
    eventTime: els.entryTime.value,
    eventType: state.entryType,
    title: els.entryTitle.value.trim(),
    details: els.entryDetails.value.trim(),
    rating: null,
    quantityMl: null,
    createdAt: new Date().toISOString(),
  };

  if (state.entryType === 'meal') {
    entry.title = els.mealName.value === 'Other' ? els.entryTitle.value.trim() : els.mealName.value;
  }

  if (state.entryType === 'drink') {
    entry.title = state.selectedDrink.name;
    entry.quantityMl = Number(els.quantityMl.value || state.selectedDrink.defaultQuantityMl);
  }

  if (['symptom', 'checkin'].includes(state.entryType)) {
    entry.rating = Number(els.entryRating.value);
  }

  return entry;
}

function compactList(items) {
  const visible = items.slice(0, 3);
  const remaining = items.length - visible.length;
  return `${visible.join(' • ')}${remaining > 0 ? ` +${remaining} more` : ''}`;
}

function labelForType(type) {
  return {
    meal: 'Meal',
    drink: 'Drink',
    symptom: 'Symptom',
    checkin: 'Daily check-in',
  }[type] || 'Entry';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function formatMl(value) {
  const ml = Number(value || 0);
  if (ml >= 1000) {
    const litres = ml / 1000;
    return `${Number.isInteger(litres) ? litres : litres.toFixed(1)}L`;
  }
  return `${ml}ml`;
}
