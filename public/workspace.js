document.addEventListener('DOMContentLoaded', () => {
  const workspace = document.getElementById('workspace');
  const miniStickyNotes = document.querySelectorAll('.mini-sticky-note');
  const editor = document.getElementById('editor');
  const editorText = document.getElementById('editorText');
  const colorOptions = document.querySelectorAll('.color-option');
  const saveEditBtn = document.getElementById('saveEdit');
  const closeEditBtn = document.getElementById('closeEdit');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');

    
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'index.html';
    });
  }

  let scale = 1; 
  const MIN_SCALE = 0.5; 
  const MAX_SCALE = 3;   
  let panX = 0, panY = 0; 
  let isPanning = false;
  let isDraggingNote = false; 
  let startX, startY;
  let currentNote = null; 
  let selectedColor = '#f8e71c'; 

  
  workspace.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 0.1;

    const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
    const newScale = Math.min(Math.max(scale + delta, MIN_SCALE), MAX_SCALE);

    const rect = workspace.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX = panX - (mouseX * (newScale - scale));
    panY = panY - (mouseY * (newScale - scale));
    scale = newScale;

    updateWorkspaceTransform();
  });

  
  workspace.addEventListener('mousedown', (e) => {
    if (!isDraggingNote && e.button === 0) { 
      isPanning = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      workspace.style.cursor = 'grabbing';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanning) {
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateWorkspaceTransform();
    }
  });

  document.addEventListener('mouseup', () => {
    isPanning = false;
    workspace.style.cursor = 'grab';
    isDraggingNote = false; 
  });

  function updateWorkspaceTransform() {
    workspace.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  
  zoomInBtn.addEventListener('click', () => {
    if (scale < MAX_SCALE) {
      scale = Math.min(scale + 0.1, MAX_SCALE); 
      updateWorkspaceTransform();
    }
  });

  
  zoomOutBtn.addEventListener('click', () => {
    if (scale > MIN_SCALE) {
      scale = Math.max(scale - 0.1, MIN_SCALE); 
      updateWorkspaceTransform();
    }
  });

  const username = localStorage.getItem('username');  

  if (username) {
    
    fetch(`/api/notes?username=${username}`)
      .then(response => response.json())
      .then(notes => {
        notes.forEach(note => {
          createStickyNote(note.color, note.text, note.left, note.top);  
        });
      })
      .catch(error => console.error('Error fetching notes:', error));
  }

  
  miniStickyNotes.forEach(miniNote => {
    miniNote.addEventListener('click', () => {
      const color = miniNote.getAttribute('data-color');
      createStickyNote(color);
    });
  });

   
   function createStickyNote(color, text = '', left = 100, top = 100) {
    const note = document.createElement('div');
    note.classList.add('sticky-note');
    note.style.backgroundColor = color;
    note.style.left = `${left}px`;
    note.style.top = `${top}px`;

    note.innerHTML = `
      <button class="delete-btn"> <img src="images/delete.svg" alt="Delete"></button>
       <textarea placeholder="Write your note..."></textarea>
      <button class="edit-btn"> <img src="images/edit.svg" alt="Edit"></button>
    `;

    
    note.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this note?')) note.remove();
      saveNotes();  
    });

    
    note.querySelector('.edit-btn').addEventListener('click', () => openEditor(note));

    makeDraggable(note);
    workspace.appendChild(note);
  }

  
  function saveNotes() {
    const notes = [];
    const stickyNotes = workspace.querySelectorAll('.sticky-note');

    stickyNotes.forEach(note => {
      const color = note.style.backgroundColor;
      const text = note.querySelector('textarea').value;
      const left = parseInt(note.style.left, 10);
      const top = parseInt(note.style.top, 10);

      notes.push({ color, text, left, top });
    });

    
    const username = localStorage.getItem('username');
    fetch('/api/saveNotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, notes })
    })
      .then(response => response.json())
      .then(data => console.log('Notes saved successfully:', data))
      .catch(error => console.error('Error saving notes:', error));
  }

  const saveAllBtn = document.getElementById('saveAllBtn');

  
  saveAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to save all notes?')) {
      saveNotes();
    }
  });

  function openEditor(note) {
    currentNote = note;
    editorText.value = note.querySelector('textarea').value; 
    selectedColor = note.style.backgroundColor; 

    
    highlightSelectedColor(selectedColor);

    editor.classList.remove('hidden');
  }

  saveEditBtn.addEventListener('click', () => {
    if (currentNote) {
  
      currentNote.querySelector('textarea').value = editorText.value;
      currentNote.style.backgroundColor = selectedColor;
      editor.classList.add('hidden');
    }
  });

  closeEditBtn.addEventListener('click', () => {
    editor.classList.add('hidden');
    currentNote = null;
  });

  
  colorOptions.forEach(option => {
    option.addEventListener('click', () => {
      colorOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      selectedColor = option.getAttribute('data-color');
    });
  });

  function highlightSelectedColor(color) {
    colorOptions.forEach(option => {
      option.classList.remove('selected');
      if (option.getAttribute('data-color') === color) {
        option.classList.add('selected');
      }
    });
  }

  
  function makeDraggable(element) {
    let offsetX, offsetY;
    element.addEventListener('mousedown', (e) => {
      e.stopPropagation(); 
      isDraggingNote = true;

      offsetX = e.clientX - element.offsetLeft;
      offsetY = e.clientY - element.offsetTop;

      function move(e) {
        element.style.left = `${e.clientX - offsetX}px`;
        element.style.top = `${e.clientY - offsetY}px`;
      }

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', move);
        isDraggingNote = false; 
      }, { once: true });
    });
  }

  
  const clearBtn = document.getElementById('clearWorkspace');
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all notes and text areas?')) {
      const allElements = workspace.querySelectorAll('.sticky-note, .text-area-wrapper');
      allElements.forEach(element => element.remove()); 
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const rootElement = document.documentElement; 

  
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = rootElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    rootElement.setAttribute('data-theme', newTheme);
  });

  
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    rootElement.setAttribute('data-theme', savedTheme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = rootElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    rootElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme); 
  });
});



