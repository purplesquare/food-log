const state = {
  date: today(),
  entryType: 'meal',
  drinks: [],
  selectedDrink: null,
};

const els = {
  date: document.querySelector('#journal-date'),
  drinkSummary: document.querySelector('#drink-summary'),
  symptomSummary: document.querySelector('#symptom-summary'),
  formPanel: document.querySelector('#form-panel'),
  formTitle: document.querySelector('#form-title'),
  closeForm: document.querySelector('#close-form'),
  entryForm: document.querySelector('#entry-form'),
  entryType: document.querySelector('#entry-type'),
  entryTime: document.querySelector('#entry-time'),
  entryTitle: document.querySelector('#entry-title'),
  titleLabel: document.querySelector('#title-label'),
  titleFields: document.querySelector('#title-fields'),
  entryDetails: document.querySelector('#entry-details'),
  drinkFields: document.querySelector('#drink-fields'),
  drinkOptions: document.querySelector('#drink-options'),
  quantityMl: document.querySelector('#quantity-ml'),
  ratingFields: document.querySelector('#rating-fields'),
  entryRating: document.querySelector('#entry-rating'),
  ratingValue: document.querySelector('#rating-value'),
  formError: document.querySelector('#form-error'),
  timeline: document.querySelector('#timeline'),
  refresh: document.querySelector('#refresh'),
  template: document.querySelector('#event-template'),
};

const formCopy = {
  meal: {
    heading: 'Add meal',
    titleLabel: 'Meal name',
    placeholder: 'Breakfast, lunch, dinner, snack…',
    notes: 'What did you eat? Add ingredients, portions, how you felt, or anything you want to remember.',
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

async function init() {
  els.date.value = state.date;
  els.entryTime.value = currentTime();

  document.querySelectorAll('[data-open-form]').forEach((button) => {
    button.addEventListener('click', () => openForm(button.dataset.openForm));
  });

  els.closeForm.addEventListener('click', closeForm);
  els.refresh.addEventListener('click', loadDay);
  els.date.addEventListener('change', () => {
    state.date = els.date.value || today();
    loadDay();
  });

  els.entryRating.addEventListener('input', () => {
    els.ratingValue.textContent = els.entryRating.value;
  });

  els.entryForm.addEventListener('submit', saveEntry);

  await loadDrinks();
  await loadDay();
}

async function loadDrinks() {
  const data = await getJson('/api/drinks');
  state.drinks = data.drinks || [];
  renderDrinkOptions();
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

async function loadDay() {
  const data = await getJson(`/api/events?date=${encodeURIComponent(state.date)}`);
  renderSummary(data.summary || {});
  renderTimeline(data.events || []);
}

function renderSummary(summary) {
  const drinkTotals = summary.drinkTotals || [];
  const symptoms = summary.symptoms || [];

  els.drinkSummary.textContent = drinkTotals.length
    ? drinkTotals.map((drink) => `${drink.title}: ${formatMl(drink.quantityMl)}`).join(' · ')
    : 'No drinks yet';

  els.symptomSummary.textContent = symptoms.length
    ? symptoms.map((symptom) => `${symptom.title}: ${symptom.highestRating}/10`).join(' · ')
    : 'Nothing logged';
}

function renderTimeline(events) {
  els.timeline.innerHTML = '';

  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No entries yet. Add a meal, drink, symptom, or check-in to start your journal.';
    els.timeline.append(empty);
    return;
  }

  events.forEach((event) => {
    const node = els.template.content.cloneNode(true);
    const article = node.querySelector('.timeline-item');
    const time = node.querySelector('.timeline-time');
    const title = node.querySelector('h3');
    const meta = node.querySelector('.timeline-meta');
    const details = node.querySelector('.timeline-details');
    const deleteButton = node.querySelector('.delete-button');

    time.textContent = event.eventTime;
    title.textContent = `${eventIcons[event.eventType] || '•'} ${event.title}`;
    meta.textContent = describeMeta(event);
    details.textContent = event.details || '';
    details.hidden = !event.details;
    article.dataset.eventId = event.id;

    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm('Delete this journal entry?');
      if (!confirmed) return;
      await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      await loadDay();
    });

    els.timeline.append(node);
  });
}

function describeMeta(event) {
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

  els.drinkFields.classList.toggle('hidden', type !== 'drink');
  els.ratingFields.classList.toggle('hidden', !['symptom', 'checkin'].includes(type));
  els.titleFields.classList.toggle('hidden', type === 'drink');

  [...els.drinkOptions.children].forEach((button) => button.classList.remove('selected'));

  if (type === 'drink' && state.drinks[0]) {
    selectDrink(state.drinks[0]);
  }

  if (type === 'checkin') {
    els.entryTitle.value = 'Daily wellbeing';
  }

  els.formPanel.classList.remove('hidden');
  els.entryTime.focus({ preventScroll: true });
  els.formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeForm() {
  els.formPanel.classList.add('hidden');
}

async function saveEntry(event) {
  event.preventDefault();
  els.formError.textContent = '';

  const eventType = state.entryType;
  const payload = {
    eventDate: state.date,
    eventTime: els.entryTime.value,
    eventType,
    title: els.entryTitle.value.trim(),
    details: els.entryDetails.value.trim(),
  };

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

  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    els.formError.textContent = data.error || 'Could not save this entry.';
    return;
  }

  closeForm();
  await loadDay();
}

async function getJson(path) {
  const response = await fetch(path);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
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
