const STORAGE_KEY = 'health-journal-events-v1';

const defaultDrinks = [
  { id: 1, name: 'Water', emoji: '💧', defaultQuantityMl: 250 },
  { id: 2, name: 'Black Tea', emoji: '☕', defaultQuantityMl: 300 },
  { id: 3, name: 'Rooibos', emoji: '🫖', defaultQuantityMl: 300 },
  { id: 4, name: 'Coffee', emoji: '☕', defaultQuantityMl: 250 },
];

const state = {
  date: today(),
  entryType: 'meal',
  drinks: defaultDrinks,
  selectedDrink: null,
  currentView: 'all',
};

const viewCopy = {
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

const els = {
  date: document.querySelector('#journal-date'),
  mealSummary: document.querySelector('#meal-summary'),
  drinkSummary: document.querySelector('#drink-summary'),
  symptomSummary: document.querySelector('#symptom-summary'),
  summaryCards: document.querySelectorAll('[data-filter]'),
  formPanel: document.querySelector('#form-panel'),
  formTitle: document.querySelector('#form-title'),
  closeForm: document.querySelector('#close-form'),
  entryForm: document.querySelector('#entry-form'),
  entryType: document.querySelector('#entry-type'),
  entryTime: document.querySelector('#entry-time'),
  entryTitle: document.querySelector('#entry-title'),
  titleLabel: document.querySelector('#title-label'),
  titleFields: document.querySelector('#title-fields'),
  mealFields: document.querySelector('#meal-fields'),
  mealName: document.querySelector('#meal-name'),
  entryDetails: document.querySelector('#entry-details'),
  drinkFields: document.querySelector('#drink-fields'),
  drinkOptions: document.querySelector('#drink-options'),
  quantityMl: document.querySelector('#quantity-ml'),
  ratingFields: document.querySelector('#rating-fields'),
  entryRating: document.querySelector('#entry-rating'),
  ratingValue: document.querySelector('#rating-value'),
  formError: document.querySelector('#form-error'),
  timelineTitle: document.querySelector('#timeline-title'),
  showAll: document.querySelector('#show-all'),
  timeline: document.querySelector('#timeline'),
  template: document.querySelector('#event-template'),
};

const formCopy = {
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

const eventIcons = {
  meal: '🍽',
  drink: '🥤',
  symptom: '😊',
  checkin: '📝',
};

init();

function init() {
  els.date.value = state.date;
  els.entryTime.value = currentTime();

  document.querySelectorAll('[data-open-form]').forEach((button) => {
    button.addEventListener('click', () => openForm(button.dataset.openForm));
  });

  els.summaryCards.forEach((card) => {
    card.addEventListener('click', () => setView(card.dataset.filter));
  });

  els.showAll.addEventListener('click', () => setView('all'));
  els.closeForm.addEventListener('click', closeForm);
  els.date.addEventListener('change', () => {
    state.date = els.date.value || today();
    loadDay();
  });

  els.mealName.addEventListener('change', updateMealTitleVisibility);
  els.entryRating.addEventListener('input', () => {
    els.ratingValue.textContent = els.entryRating.value;
  });

  els.entryForm.addEventListener('submit', saveEntry);

  renderDrinkOptions();
  loadDay();
}

function renderDrinkOptions() {
  els.drinkOptions.innerHTML = '';

  state.drinks.forEach((drink) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-button';
    button.textContent = `${drink.emoji} ${drink.name}`;
    button.addEventListener('click', () => selectDrink(drink));
    els.drinkOptions.append(button);
  });
}

function selectDrink(drink) {
  state.selectedDrink = drink;
  els.entryTitle.value = drink.name;
  els.quantityMl.value = drink.defaultQuantityMl;

  [...els.drinkOptions.children].forEach((button) => {
    button.classList.toggle('selected', button.textContent.includes(drink.name));
  });
}

function setView(view) {
  state.currentView = view || 'all';
  loadDay();
  els.timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadDay() {
  const events = getEventsForDate(state.date);
  renderSummary(buildSummary(events));
  renderTimeline(events);
}

function getAllEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAllEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function getEventsForDate(date) {
  return getAllEvents()
    .filter((event) => event.eventDate === date)
    .sort((a, b) => a.eventTime.localeCompare(b.eventTime) || a.id - b.id);
}

function buildSummary(events) {
  const mealNames = [];
  const drinkMap = new Map();
  const symptomMap = new Map();

  events.forEach((event) => {
    if (event.eventType === 'meal') {
      mealNames.push(event.title);
    }

    if (event.eventType === 'drink') {
      drinkMap.set(event.title, (drinkMap.get(event.title) || 0) + Number(event.quantityMl || 0));
    }

    if (event.eventType === 'symptom') {
      const current = symptomMap.get(event.title) || 0;
      symptomMap.set(event.title, Math.max(current, Number(event.rating || 0)));
    }
  });

  return {
    meals: mealNames,
    drinkTotals: [...drinkMap.entries()].map(([title, quantityMl]) => ({ title, quantityMl })),
    symptoms: [...symptomMap.entries()].map(([title, highestRating]) => ({ title, highestRating })),
  };
}

function renderSummary(summary) {
  const meals = summary.meals || [];
  const drinkTotals = summary.drinkTotals || [];
  const symptoms = summary.symptoms || [];

  els.mealSummary.textContent = meals.length ? compactList(meals) : 'No meals yet';

  els.drinkSummary.textContent = drinkTotals.length
    ? drinkTotals.map((drink) => `${drink.title}: ${formatMl(drink.quantityMl)}`).join(' · ')
    : 'No drinks yet';

  els.symptomSummary.textContent = symptoms.length
    ? symptoms.map((symptom) => `${symptom.title}: ${symptom.highestRating}/10`).join(' · ')
    : 'Nothing logged';
}

function compactList(items) {
  const visible = items.slice(0, 3);
  const remaining = items.length - visible.length;
  return `${visible.join(' • ')}${remaining > 0 ? ` +${remaining} more` : ''}`;
}

function renderTimeline(events) {
  const view = viewCopy[state.currentView] || viewCopy.all;
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
      const confirmed = window.confirm('Delete this journal entry?');
      if (!confirmed) return;
      saveAllEvents(getAllEvents().filter((item) => item.id !== event.id));
      loadDay();
    });

    els.timeline.append(node);
  });
}

function formatEventTitle(event) {
  if (state.currentView === 'all') {
    return `${eventIcons[event.eventType] || '•'} ${event.title}`;
  }

  if (event.eventType === 'drink') {
    return `${eventIcons.drink} ${event.title}${event.quantityMl ? ` · ${formatMl(event.quantityMl)}` : ''}`;
  }

  if (event.eventType === 'symptom') {
    return `${eventIcons.symptom} ${event.title}${event.rating !== null && event.rating !== undefined ? ` · ${event.rating}/10` : ''}`;
  }

  return `${eventIcons[event.eventType] || '•'} ${event.title}`;
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

function labelForType(type) {
  return {
    meal: 'Meal',
    drink: 'Drink',
    symptom: 'Symptom',
    checkin: 'Daily check-in',
  }[type] || 'Entry';
}

function openForm(type) {
  state.entryType = type;
  state.selectedDrink = null;
  els.entryForm.reset();
  els.formError.textContent = '';
  els.entryType.value = type;
  els.entryTime.value = currentTime();
  els.entryRating.value = '5';
  els.ratingValue.textContent = '5';

  const copy = formCopy[type];
  els.formTitle.textContent = copy.heading;
  els.titleLabel.textContent = copy.titleLabel;
  els.entryTitle.placeholder = copy.placeholder;
  els.entryDetails.placeholder = copy.notes;

  els.mealFields.classList.toggle('hidden', type !== 'meal');
  els.drinkFields.classList.toggle('hidden', type !== 'drink');
  els.ratingFields.classList.toggle('hidden', !['symptom', 'checkin'].includes(type));
  els.titleFields.classList.toggle('hidden', type === 'drink' || type === 'meal');

  [...els.drinkOptions.children].forEach((button) => button.classList.remove('selected'));

  if (type === 'drink' && state.drinks[0]) {
    selectDrink(state.drinks[0]);
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

  const eventType = state.entryType;
  const payload = {
    id: Date.now(),
    eventDate: state.date,
    eventTime: els.entryTime.value,
    eventType,
    title: els.entryTitle.value.trim(),
    details: els.entryDetails.value.trim(),
    rating: null,
    quantityMl: null,
    createdAt: new Date().toISOString(),
  };

  if (eventType === 'meal') {
    payload.title = els.mealName.value === 'Other' ? els.entryTitle.value.trim() : els.mealName.value;
  }

  if (eventType === 'drink') {
    if (!state.selectedDrink) {
      els.formError.textContent = 'Choose a drink.';
      return;
    }

    payload.title = state.selectedDrink.name;
    payload.quantityMl = Number(els.quantityMl.value || state.selectedDrink.defaultQuantityMl);
  }

  if (['symptom', 'checkin'].includes(eventType)) {
    payload.rating = Number(els.entryRating.value);
  }

  if (!payload.title) {
    els.formError.textContent = 'Add a title before saving.';
    return;
  }

  saveAllEvents([...getAllEvents(), payload]);
  closeForm();
  loadDay();
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
