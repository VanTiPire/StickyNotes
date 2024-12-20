document.addEventListener('DOMContentLoaded', async () => {
  const username = localStorage.getItem('username');
  const notesContainer = document.querySelector('.folders');
  const filterButtons = document.querySelectorAll('.folder-filters div'); 

  
  function setActiveFilter(clickedButton) {
    
    filterButtons.forEach((button) => button.classList.remove('active'));

    
    clickedButton.classList.add('active');
  }

  
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveFilter(button); 
      const filter = button.id.replace('-btn', ''); 
      fetchAndDisplayFolders(filter); 
    });
  });

  
  const defaultFilter = document.getElementById('week-btn');
  if (defaultFilter) {
    defaultFilter.classList.add('active');
  }

  
  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  
  function isToday(date) {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  }

  function isThisWeek(date) {
    const today = new Date();
    const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

    return date >= firstDayOfWeek && date <= lastDayOfWeek;
  }

  function isThisMonth(date) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return date >= firstDayOfMonth && date <= lastDayOfMonth;
  }

  async function fetchAndDisplayFolders(filter = 'all') {
    if (username) {
      try {
        const response = await fetch(`/api/folders?username=${username}`);
        const folders = await response.json();
        const newFolderButton = document.querySelector('#new-folder');

        Array.from(notesContainer.children).forEach(child => {
          if (child !== newFolderButton) {
            child.remove(); 
          }
        });

        folders.forEach(({ name, color, createdAt }) => {
          const createdDate = new Date(createdAt);

          if (
            (filter === 'today' && isToday(createdDate)) ||
            (filter === 'week' && isThisWeek(createdDate)) ||
            (filter === 'month' && isThisMonth(createdDate)) ||
            filter === 'all'
          ) {
            createFolderElement(name, color, createdAt, notesContainer);
          }
        });
      } catch (err) {
        console.error('Error fetching folders:', err);
      }
    }
  }

  const newFolderButton = document.getElementById('new-folder');
  if (newFolderButton) {
    newFolderButton.addEventListener('click', () => {
      openFolderPopup('Create New Folder', '', '', async (folderName, selectedColor) => {
        try {
          const response = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, folderName, color: selectedColor }),
          });

          if (response.ok) {
            const { createdAt } = await response.json(); 
            const notesContainer = document.querySelector('.folders');
            createFolderElement(folderName, selectedColor, createdAt, notesContainer);
          } else {
            console.error('Error creating folder:', await response.text());
          }
        } catch (err) {
          console.error('Error creating folder:', err);
        }
      });
    });
  }

  document.getElementById('today-btn').addEventListener('click', () => fetchAndDisplayFolders('today'));
  document.getElementById('week-btn').addEventListener('click', () => fetchAndDisplayFolders('week'));
  document.getElementById('month-btn').addEventListener('click', () => fetchAndDisplayFolders('month'));


  fetchAndDisplayFolders();

  function createFolderElement(name, color, createdAt, container) {
    const folder = document.createElement('div');
    folder.className = 'folder';
    folder.style.backgroundColor = color;

    const date = new Date(createdAt);
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')
      }/${date.getFullYear()}`;

    folder.innerHTML = `

    <div class="folder-info">
       <div class="folder-text">
        <p class="folder-name">${name}</p>
        <span class="folder-date">${formattedDate}</span>
       </div>
       <div class="folder-actions">
          <div class="edit-folder" title="Edit">
          <img src="images/edit.svg" alt="Edit">
         </div>
          <div class="delete-folder" title="Delete">
           <img src="images/delete.svg" alt="Delete">
          </div>
        </div>
      </div>
    `;

    folder.querySelector('.edit-folder').addEventListener('click', () => {
      openFolderPopup('Edit Folder', name, color, async (newName, newColor) => {
        try {
          const response = await fetch('/api/folders/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, currentName: name, newName, newColor }),
          });

          if (response.ok) {
            folder.querySelector('.folder-name').textContent = newName;
            folder.style.backgroundColor = newColor;
          } else {
            console.error('Error updating folder:', await response.text());
          }
        } catch (err) {
          console.error('Error updating folder:', err);
        }
      });
    });

    folder.querySelector('.delete-folder').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete the folder "${name}"?`)) {
        try {
          const response = await fetch('/api/folders/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, folderName: name }),
          });

          if (response.ok) {
            container.removeChild(folder);
          } else {
            console.error('Error deleting folder:', await response.text());
          }
        } catch (err) {
          console.error('Error deleting folder:', err);
        }
      }
    });

    container.insertBefore(folder, document.getElementById('new-folder'));
  }

  function openFolderPopup(title, currentName, currentColor, onSave) {
    const popup = document.createElement('div');
    popup.className = 'folder-popup';

    popup.innerHTML = `
      <div class="popup-content">
        <h2>${title}</h2>
        <label for="folder-name">Folder Name:</label>
        <input type="text" id="folder-name" value="${currentName}" placeholder="Enter folder name" />

        <label for="folder-color">Choose Color:</label>
        <div class="color-options">
          <div class="color-option" style="background-color: #EEAAAA;" data-color="#eeaaaa"></div>
          <div class="color-option" style="background-color: #E9E481;" data-color="#e9e481"></div>
          <div class="color-option" style="background-color: #6CDF81;" data-color="#6cdf81"></div>
          <div class="color-option" style="background-color: #6CB5DF;" data-color="#6cb5df"></div>
        </div>

        <div class="popup-buttons">
          <button id="save-folder">Save</button>
          <button id="cancel-folder">Cancel</button>
        </div>
      </div>
    `;

    let selectedColor = currentColor || null;
    const colorOptions = popup.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      if (option.getAttribute('data-color') === currentColor) {
        option.classList.add('selected');
      }

      option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedColor = option.getAttribute('data-color');
      });
    });

    popup.querySelector('#save-folder').addEventListener('click', () => {
      const folderName = popup.querySelector('#folder-name').value.trim();

      if (!folderName || !selectedColor) {
        alert('Please provide a folder name and select a color.');
        return;
      }

      onSave(folderName, selectedColor);
      document.body.removeChild(popup);
    });

    popup.querySelector('#cancel-folder').addEventListener('click', () => {
      document.body.removeChild(popup);
    });

    document.body.appendChild(popup);
  }

  const container = document.getElementById('container');
  if (container) {
    container.classList.add('fade-in');
  }

  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');
  if (signUpButton && signInButton) {
    signUpButton.addEventListener('click', () => {
      container.classList.add("right-panel-active");
    });

    signInButton.addEventListener('click', () => {
      container.classList.remove("right-panel-active");
    });
  }

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'index.html';
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {

  const loginForm = document.querySelector('form[action="/login"]');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const { username } = await response.json();
          localStorage.setItem('username', username);
          window.location.href = 'home.html';
        } else {
          console.error('Login failed:', await response.text());
        }
      } catch (err) {
        console.error('Error logging in:', err);
      }
    });
  }

  const registerForm = document.querySelector('form[action="/register"]');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          alert('Account created successfully! You can now log in.');
          document.getElementById('container').classList.remove('right-panel-active');
        } else {
          console.error('Registration failed:', await response.text());
        }
      } catch (err) {
        console.error('Error registering:', err);
      }
    });
  }

  const guestButton = document.getElementById('continueAsGuest');
  if (guestButton) {
    guestButton.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('username', 'Guest');
      window.location.href = 'home.html';
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const notesContainer = document.querySelector('.notes');
  const newNoteElement = document.querySelector('#new-note'); 
  const username = localStorage.getItem('username'); 

  if (username) {
  
    fetch(`/api/notes?username=${username}`)
      .then(response => response.json())
      .then(notes => {
        notes.forEach(note => {
          addNoteToHomePage(note.color, note.title, note.text); 
        });
      })
      .catch(error => console.error('Error fetching notes:', error));
  }

 
  function addNoteToHomePage(color, title, text) {
  const noteElement = document.createElement('div');
  noteElement.classList.add('note');
  noteElement.style.backgroundColor = color;

  noteElement.innerHTML = `
    <div class="note-info">
      <div class="note-text">
        <p id="note-title" class="note-title">${title || 'Untitled Note'}</p>
        <p class="note-name">${text}</p>
      </div>
      <div class="note-actions">
        <a href="workspace.html"><div class="edit-note" title="Edit">
          <img src="images/edit.svg" alt="Edit">
        </div></a>
        <a href="workspace.html"><div class="delete-note" title="Delete">
          <img src="images/delete.svg" alt="Delete">
        </div></a>
      </div>
    </div>
  `;

  notesContainer.insertBefore(noteElement, newNoteElement);
}
});