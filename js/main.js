const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const tasksFilePath = path.join(__dirname, '../assets/data/tasks.json');
const categoriesFilePath = path.join(__dirname, '../assets/data/categories.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile(path.join(__dirname, '../index.html'));
}

app.whenReady().then(createWindow);

// Fonctions utilitaires pour lire et écrire les fichiers JSON
function readJSON(filePath, callback) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err || !data) {
      callback([]);
    } else {
      try {
        callback(JSON.parse(data));
      } catch (e) {
        callback([]);
      }
    }
  });
}

function writeJSON(filePath, data, callback) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), callback);
}

// Gestion des tâches
ipcMain.on('load-tasks', (event) => {
  readJSON(tasksFilePath, (tasks) => {
    event.reply('load-tasks-reply', tasks);
  });
});

ipcMain.on('save-task', (event, taskData) => {
  readJSON(tasksFilePath, (tasks) => {
    tasks.push({ ...taskData, completed: false });
    writeJSON(tasksFilePath, tasks, (err) => {
      if (err) {
        console.error('Erreur de sauvegarde de tâche:', err);
      } else {
        event.reply('task-saved', tasks);
      }
    });
  });
});

ipcMain.on('edit-task', (event, { index, updatedTask }) => {
  readJSON(tasksFilePath, (tasks) => {
    if (tasks[index]) {
      tasks[index] = updatedTask;
      writeJSON(tasksFilePath, tasks, (err) => {
        if (err) {
          console.error('Erreur de modification de tâche:', err);
        } else {
          event.reply('task-updated', tasks);
        }
      });
    }
  });
});

ipcMain.on('delete-task', (event, taskIndex) => {
  readJSON(tasksFilePath, (tasks) => {
    if (tasks[taskIndex]) {
      tasks.splice(taskIndex, 1);
      writeJSON(tasksFilePath, tasks, (err) => {
        if (err) {
          console.error('Erreur de suppression de tâche:', err);
        } else {
          event.reply('task-updated', tasks);
        }
      });
    }
  });
});

// Gestion des catégories
ipcMain.on('load-categories', (event) => {
  readJSON(categoriesFilePath, (categories) => {
    event.reply('categories-loaded', categories);
  });
});

ipcMain.on('add-category', (event, category) => {
  readJSON(categoriesFilePath, (categories) => {
    if (!categories.includes(category)) {
      categories.push(category);
      writeJSON(categoriesFilePath, categories, (err) => {
        if (err) {
          console.error('Erreur d’ajout de catégorie:', err);
        } else {
          event.reply('categories-updated', categories);
        }
      });
    }
  });
});

ipcMain.on('delete-category', (event, category) => {
  readJSON(categoriesFilePath, (categories) => {
    categories = categories.filter(cat => cat !== category);
    writeJSON(categoriesFilePath, categories, (err) => {
      if (err) {
        console.error('Erreur de suppression de catégorie:', err);
      } else {
        event.reply('categories-updated', categories);
      }
    });
  });
});
