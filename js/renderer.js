const { ipcRenderer } = require('electron');

let tasks = [];
let categories = [];
let selectedCategory = null;
let selectedTaskIndex = null;
let dateFilter = null; // Valeur possible : "all", "day", "week" ou null (désactivé)

document.addEventListener('DOMContentLoaded', () => {
  // Récupération des éléments DOM
  const middleColumnTitle = document.querySelector('.middle-column h2');
  const rightColumnTitle = document.getElementById('taskTitle');
  rightColumnTitle.addEventListener('dblclick', dblclickHandler);

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
    displayCompletedTasks();
    selectedTaskIndex = tasks.length - 1;
    displayTaskDetail(selectedTaskIndex);
  });
  
  ipcRenderer.on('task-updated', (event, updatedTasks) => {
    tasks = updatedTasks;
    displayTasks();
    displayCompletedTasks();
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
    // Gestion des catégories normales
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
        // Désactiver le filtre par date
        dateFilter = null;
        dateFilterItems.forEach(i => i.classList.remove('selected'));
        // Mise à jour du titre de la colonne du milieu
        middleColumnTitle.textContent = cat;
        displayCategories();
        displayTasks();
      });
      // Gestion du clic droit pour suppression (si nécessaire)
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
  
    // Gestion de la catégorie spéciale "Terminées"
    const specialCategoryEl = document.getElementById('special-category');
    specialCategoryEl.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = 'Terminées';
    li.classList.add('category-item');
    if (selectedCategory === 'Terminées') {
      li.classList.add('selected');
    }
    li.addEventListener('click', () => {
      selectedCategory = 'Terminées';
      // Désactiver le filtre par date
      dateFilter = null;
      dateFilterItems.forEach(i => i.classList.remove('selected'));
      // Mise à jour du titre de la colonne du milieu
      middleColumnTitle.textContent = 'Terminées';
      displayCategories();
      displayTasks();
    });      
    specialCategoryEl.appendChild(li);
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
        ipcRenderer.send('save-task', {
          name,
          description: '',
          category: selectedCategory,
          date: new Date()
        });
        newTaskNameInput.value = '';
      }
    }
  });

  function displayTasks() {
    taskListEl.innerHTML = '';
    let filteredTasks = tasks;
    
    if (dateFilter) {
      // Filtrage par date (on affiche uniquement les tâches non terminées)
      const now = new Date();
      if (dateFilter === 'day') {
        filteredTasks = filteredTasks.filter(task => {
          const taskDate = new Date(task.date);
          return taskDate.toDateString() === now.toDateString();
        });
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        filteredTasks = filteredTasks.filter(task => {
          const taskDate = new Date(task.date);
          return taskDate >= startOfWeek && taskDate < endOfWeek;
        });
      }
      // On affiche uniquement les tâches non terminées
      filteredTasks = filteredTasks.filter(task => !task.completed);
    }
    else if (selectedCategory) {
      // Filtrage par catégorie
      if (selectedCategory === 'Terminées') {
        filteredTasks = filteredTasks.filter(task => task.completed);
      } else {
        filteredTasks = filteredTasks.filter(task => task.category === selectedCategory && !task.completed);
      }
    }
    else {
      // Aucun filtre sélectionné : affichage par défaut des tâches non terminées
      filteredTasks = filteredTasks.filter(task => !task.completed);
    }
  
    // Affichage des tâches filtrées
    filteredTasks.forEach((task) => {
      const li = document.createElement('li');
  
      // Ajout d'une checkbox pour marquer la tâche comme terminée ou non
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        ipcRenderer.send('edit-task', { index: tasks.findIndex(t => t === task), updatedTask: task });
      });
      li.appendChild(checkbox);
  
      // Affichage du nom de la tâche
      const span = document.createElement('span');
      span.textContent = task.name;
      li.appendChild(span);
  
      // Sélection pour afficher les détails de la tâche
      li.addEventListener('click', () => {
        selectedTaskIndex = tasks.findIndex(t => t === task);
        displayTaskDetail(selectedTaskIndex);
      });
  
      // Gestion du clic droit pour la suppression
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

  const dateFilterItems = document.querySelectorAll('#date-filter-list .filter-item');
  dateFilterItems.forEach(item => {
    item.addEventListener('click', () => {
      dateFilter = item.getAttribute('data-filter'); // "all", "day" ou "week"
      // Désactiver la sélection de catégorie
      selectedCategory = null;
      // Gestion du style sélectionné pour le tri par date
      dateFilterItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      // Retirer la sélection visuelle sur les catégories
      document.querySelectorAll('#category-list .category-item, #special-category .category-item')
        .forEach(el => el.classList.remove('selected'));
      displayTasks();
    });
  });  

  function displayCompletedTasks() {
    const completedTaskListEl = document.getElementById('completed-task-list');
    completedTaskListEl.innerHTML = '';
    const completedTasks = tasks.filter(task => task.completed);
    completedTasks.forEach((task) => {
      const li = document.createElement('li');
      li.textContent = task.name;
      // Vous pouvez ajouter ici un événement pour éventuellement remettre la tâche en cours
      completedTaskListEl.appendChild(li);
    });
  }
  

  // Affichage des détails d'une tâche dans la colonne de droite
  function displayTaskDetail(index) {
    const task = tasks[index];
    if (!task) return;
    // Met à jour le titre du panneau droit avec le nom de la tâche
    const taskTitleElement = document.getElementById('taskTitle');
    taskTitleElement.textContent = task.name;
    // S’assurer que le double-clic est toujours attaché
    taskTitleElement.removeEventListener('dblclick', dblclickHandler);
    taskTitleElement.addEventListener('dblclick', dblclickHandler);
    
    // Met à jour le textarea pour la description
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

  function dblclickHandler(e) {
    const h2 = e.target;
    // Créer un input avec la valeur actuelle
    const input = document.createElement('input');
    input.type = 'text';
    input.value = h2.textContent;
    input.className = 'edit-task-title-input';
    
    // Remplacer le h2 par l’input
    h2.parentNode.replaceChild(input, h2);
    input.focus();
  
    // Fonction pour terminer l’édition
    function finishEditing() {
      const newName = input.value.trim();
      // Si une tâche est sélectionnée, on met à jour son nom et on envoie la modification
      if (selectedTaskIndex !== null) {
        const task = tasks[selectedTaskIndex];
        if (task) {
          task.name = newName;
          ipcRenderer.send('edit-task', { index: selectedTaskIndex, updatedTask: task });
        }
      }
      // Créer un nouveau h2 avec le nouveau nom
      const newH2 = document.createElement('h2');
      newH2.id = 'taskTitle';
      newH2.textContent = newName || "Détails de la tâche";
      newH2.addEventListener('dblclick', dblclickHandler);
      input.parentNode.replaceChild(newH2, input);
    }
  
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishEditing();
      }
    });
  }  
});
