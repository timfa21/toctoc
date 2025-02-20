const { ipcRenderer } = require('electron');

let tasks = [];
let categories = [];
let selectedCategory = null;
let selectedTaskIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  // Récupération des éléments DOM
  const categoryListEl = document.getElementById('category-list');
  const addCategorySlotBtn = document.getElementById('addCategorySlot');
  const newTaskNameInput = document.getElementById('newTaskName');
  const taskListEl = document.getElementById('task-list');
  
  const editTaskNameInput = document.getElementById('edit-task-name');
  const editTaskDescInput = document.getElementById('edit-task-desc');
  const saveTaskChangesBtn = document.getElementById('saveTaskChanges');

  // Chargement initial des tâches et catégories
  ipcRenderer.send('load-tasks');
  ipcRenderer.send('load-categories');

  ipcRenderer.on('load-tasks-reply', (event, loadedTasks) => {
    tasks = loadedTasks;
    displayTasks();
  });

  ipcRenderer.on('task-saved', (event, updatedTasks) => {
    tasks = updatedTasks;
    displayTasks();
    // Sélection automatique de la dernière tâche ajoutée
    selectedTaskIndex = tasks.length - 1;
    displayTaskDetail(selectedTaskIndex);
  });

  ipcRenderer.on('task-updated', (event, updatedTasks) => {
    tasks = updatedTasks;
    displayTasks();
    if (selectedTaskIndex !== null) {
      displayTaskDetail(selectedTaskIndex);
    }
  });

  ipcRenderer.on('categories-loaded', (event, loadedCategories) => {
    categories = loadedCategories;
    displayCategories();
  });

  ipcRenderer.on('categories-updated', (event, updatedCategories) => {
    categories = updatedCategories;
    displayCategories();
  });

  // Ajout d'un slot pour une nouvelle catégorie via le bouton +
  addCategorySlotBtn.addEventListener('click', () => {
    if (!document.querySelector('.new-category-input')) {
      const li = document.createElement('li');
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Nom de la catégorie';
      input.className = 'new-category-input';
      li.appendChild(input);
      categoryListEl.appendChild(li);
      input.focus();

      input.addEventListener('blur', () => {
        if (input.value.trim() !== '') {
          ipcRenderer.send('add-category', input.value.trim());
        }
        li.remove();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        }
      });
    }
  });

  // Affichage des catégories avec suppression par clic droit
  function displayCategories() {
    categoryListEl.innerHTML = '';
    categories.forEach((cat) => {
      const li = document.createElement('li');
      li.textContent = cat;
      li.classList.add('category-item');
      if (cat === selectedCategory) {
        li.classList.add('selected');
      }
      li.addEventListener('click', () => {
        selectedCategory = cat;
        displayCategories();
        displayTasks();
        clearTaskDetail();
      });
      // Clic droit pour afficher le bouton de suppression
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        document.querySelectorAll('.delete-category-btn').forEach(btn => btn.remove());
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Supprimer';
        delBtn.className = 'delete-category-btn';
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          ipcRenderer.send('delete-category', cat);
          if (selectedCategory === cat) {
            selectedCategory = null;
            clearTaskDetail();
          }
          delBtn.remove();
        });
        li.appendChild(delBtn);
        document.addEventListener('click', function handler(event) {
          if (!li.contains(event.target)) {
            delBtn.remove();
            document.removeEventListener('click', handler);
          }
        });
      });
      categoryListEl.appendChild(li);
    });
  }

  // Ajout d'une tâche : en tapant dans le champ et en appuyant sur Entrée
  newTaskNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = newTaskNameInput.value.trim();
      if (!selectedCategory) {
        alert("Veuillez sélectionner une catégorie avant d'ajouter une tâche.");
        return;
      }
      if (name) {
        ipcRenderer.send('save-task', { name, description: '', category: selectedCategory });
        newTaskNameInput.value = '';
      }
    }
  });

  // Affichage des tâches (filtrées par la catégorie sélectionnée)
  function displayTasks() {
    taskListEl.innerHTML = '';
    const filteredTasks = selectedCategory ? tasks.filter(task => task.category === selectedCategory) : tasks;
    filteredTasks.forEach((task) => {
      const li = document.createElement('li');
      li.textContent = task.name;
      // Clic gauche : affiche les détails de la tâche
      li.addEventListener('click', () => {
        selectedTaskIndex = tasks.findIndex(t => t === task);
        displayTaskDetail(selectedTaskIndex);
      });
      // Clic droit : affiche un bouton de suppression pour la tâche
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Supprimer';
        delBtn.className = 'delete-btn';
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const index = tasks.findIndex(t => t === task);
          ipcRenderer.send('delete-task', index);
          clearTaskDetail();
        });
        li.appendChild(delBtn);
        document.addEventListener('click', function handler(event) {
          if (!li.contains(event.target)) {
            delBtn.remove();
            document.removeEventListener('click', handler);
          }
        });
      });
      taskListEl.appendChild(li);
    });
  }

  // Affichage des détails d'une tâche dans la colonne de droite
  function displayTaskDetail(index) {
    const task = tasks[index];
    if (!task) return;
    editTaskNameInput.value = task.name;
    editTaskDescInput.value = task.description;
  }

  // Enregistrer les modifications sur la tâche sélectionnée
  saveTaskChangesBtn.addEventListener('click', () => {
    if (selectedTaskIndex !== null) {
      const updatedName = editTaskNameInput.value.trim();
      const updatedDesc = editTaskDescInput.value.trim();
      if (updatedName) {
        const updatedTask = { ...tasks[selectedTaskIndex], name: updatedName, description: updatedDesc };
        ipcRenderer.send('edit-task', { index: selectedTaskIndex, updatedTask });
      }
    }
  });

  // Réinitialiser le panneau de détails
  function clearTaskDetail() {
    editTaskNameInput.value = '';
    editTaskDescInput.value = '';
    selectedTaskIndex = null;
  }
});
