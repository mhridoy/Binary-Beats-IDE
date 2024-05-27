var currentEditor;
var editors = {};
var isResizing = false;
var lastKnownMouseX = 0;
var animationFrameRequested = false;
var autoRunTimeout;
var autosaveInterval;
var currentFontSize = 14; // Default font size for Monaco editor

function initMonaco() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs' }});
    require(['vs/editor/editor.main'], function () {
        editors.html = monaco.editor.create(document.getElementById('htmlEditor'), {
            value: localStorage.getItem('htmlCode') || '<!-- HTML goes here -->',
            language: 'html',
            theme: 'vs-dark',
            automaticLayout: true,
            suggestOnTriggerCharacters: true, // Enable auto code suggestions
            wordBasedSuggestions: true,
            formatOnType: true, // Format code on type
            formatOnPaste: true // Format code on paste
        });
        editors.css = monaco.editor.create(document.getElementById('cssEditor'), {
            value: localStorage.getItem('cssCode') || '/* CSS goes here */',
            language: 'css',
            theme: 'vs-dark',
            automaticLayout: true,
            suggestOnTriggerCharacters: true, // Enable auto code suggestions
            wordBasedSuggestions: true,
            formatOnType: true, // Format code on type
            formatOnPaste: true // Format code on paste
        });
        editors.js = monaco.editor.create(document.getElementById('jsEditor'), {
            value: localStorage.getItem('jsCode') || '// JavaScript goes here',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            suggestOnTriggerCharacters: true, // Enable auto code suggestions
            wordBasedSuggestions: true,
            formatOnType: true, // Format code on type
            formatOnPaste: true // Format code on paste
        });

        // Show HTML editor by default
        currentEditor = 'html';
        document.getElementById('htmlEditor').style.display = 'block';

        // Setup automatic run for each editor
        Object.keys(editors).forEach(function (editorKey) {
            editors[editorKey].onDidChangeModelContent(function () {
                clearTimeout(autoRunTimeout);
                autoRunTimeout = setTimeout(runCode, 500); // Run code 500 ms after the last edit
            });
        });

        // Start autosave
        autosaveInterval = setInterval(autosaveCode, 5000); // Autosave every 5 seconds
    });
}

function showEditor(lang) {
    Object.keys(editors).forEach(function(key) {
        document.getElementById(key + 'Editor').style.display = 'none';
    });
    currentEditor = editors[lang];
    document.getElementById(lang + 'Editor').style.display = 'block';
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase() === lang) {
            tab.classList.add('active');
        }
    });
}

function runCode() {
    var htmlCode = editors.html.getValue();
    var cssCode = "<style>" + editors.css.getValue() + "</style>";
    var jsCode = "<script>try{" + editors.js.getValue() + "}catch(error){document.getElementById('errorDisplay').textContent = error.message;}<\/script>";
    var iframe = document.getElementById('output').contentWindow.document;
    iframe.open();
    iframe.write(htmlCode + cssCode + jsCode);
    iframe.close();
}

function saveCode() {
    localStorage.setItem('htmlCode', editors.html.getValue());
    localStorage.setItem('cssCode', editors.css.getValue());
    localStorage.setItem('jsCode', editors.js.getValue());

    document.getElementById('html_code').value = editors.html.getValue();
    document.getElementById('css_code').value = editors.css.getValue();
    document.getElementById('js_code').value = editors.js.getValue();
    document.getElementById('saveForm').submit();
}

function shareOutput() {
    var htmlCode = editors.html.getValue();
    var cssCode = editors.css.getValue();
    var jsCode = editors.js.getValue();

    // Packaging the code for sharing
    var combinedCode = {
        html_code: htmlCode,
        css_code: cssCode,
        js_code: jsCode
    };

    // Sending the packaged code to the server
    fetch('/save_snippet', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(combinedCode)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Check if the server response includes the unique_id
        if (!data.unique_id) {
            throw new Error('Response JSON does not include unique_id');
        }
        const outputShareUrl = `${window.location.origin}/share/output/${data.unique_id}`;
        document.getElementById('shareLink').innerHTML = `Output Link: <a href="${outputShareUrl}" target="_blank">${outputShareUrl}</a>`;
        alert('Share link generated successfully!');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to generate share link.');
    });
}

function shareCode() {
    var htmlCode = editors.html.getValue();
    var cssCode = editors.css.getValue();
    var jsCode = editors.js.getValue();

    // Sending the code to the server to save and generate a shareable link
    fetch('/save_snippet', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Add CSRF token header if you're using CSRF protection
        },
        body: JSON.stringify({html_code: htmlCode, css_code: cssCode, js_code: jsCode})
    })
    .then(response => response.json())
    .then(data => {
        // Update to use the returned unique_id to generate the shareable link
        const shareUrl = window.location.href + 'share/' + data.unique_id; // Adjust if needed
        document.getElementById('shareLink').innerHTML = `
            <span>Shareable Code Link:</span>
            <a href="${shareUrl}" target="_blank" class="shareable-link">${shareUrl}</a>
            <button onclick="copyToClipboard('${shareUrl}')" class="copy-button"><i class="fas fa-clipboard"></i></button>
        `;
        alert('Share link generated successfully!');
    })
    .catch(error => console.error('Error:', error));
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    });
}

function autosaveCode() {
    saveCode();
    console.log('Autosaved at ' + new Date().toLocaleTimeString());
}

function resetEditor() {
    if (confirm('Are you sure you want to reset the editor? This action cannot be undone.')) {
        editors.html.setValue('<!-- HTML goes here -->');
        editors.css.setValue('/* CSS goes here */');
        editors.js.setValue('// JavaScript goes here');
        saveCode();
    }
}

function changeZoom(direction) {
    // Increment or decrement font size
    currentFontSize += direction;
    // Set minimum and maximum font size limits
    currentFontSize = Math.max(10, Math.min(30, currentFontSize));

    // Apply the font size change to all editors
    editors.html.updateOptions({ 'fontSize': currentFontSize });
    editors.css.updateOptions({ 'fontSize': currentFontSize });
    editors.js.updateOptions({ 'fontSize': currentFontSize });
}

// Initialize resize event
function initResize() {
    isResizing = true;
}

// Resize function using requestAnimationFrame
function resize() {
    if (!isResizing) return;

    // Avoid unnecessary layout recalculations by only updating when needed
    if (!animationFrameRequested) {
        animationFrameRequested = true;
        requestAnimationFrame(function () {
            var container = document.getElementById('editorOutputContainer');
            var containerRect = container.getBoundingClientRect();
            var newWidth = lastKnownMouseX - containerRect.left;

            if (newWidth < 100) newWidth = 100;
            if (newWidth > containerRect.width - 100) newWidth = containerRect.width - 100;

            var editorContainer = document.querySelector('.editor:not([style*="display: none"])');
            var outputContainer = document.getElementById('output');

            editorContainer.style.width = newWidth + 'px';
            outputContainer.style.width = (containerRect.width - newWidth) + 'px';

            Object.keys(editors).forEach(function (key) {
                editors[key].layout();
            });

            animationFrameRequested = false;
        });
    }
}

// Event listener for mouse move
window.addEventListener('mousemove', function (e) {
    lastKnownMouseX = e.clientX;
    if (isResizing) {
        resize();
    }
}, false);

// Attach the event listeners for resizing
document.addEventListener('DOMContentLoaded', function() {
    initMonaco();

    var resizeBar = document.querySelector('.resize');
    resizeBar.addEventListener('mousedown', function(e) {
        isResizing = true;
        e.preventDefault(); // Prevent text selection during drag
    }, false);

    window.addEventListener('mouseup', function() {
        isResizing = false;
    }, false);
});

// Theme switching functionality
function switchTheme() {
    const currentTheme = editors.html._themeService._theme.themeName;
    const newTheme = currentTheme === 'vs-dark' ? 'vs-light' : (currentTheme === 'vs-light' ? 'hc-black' : 'vs-dark');
    Object.keys(editors).forEach(key => {
        monaco.editor.setTheme(newTheme);
    });
}

function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileContent = event.target.result;
            const fileExtension = file.name.split('.').pop().toLowerCase();
            let editor;
            switch (fileExtension) {
                case 'html':
                    editor = editors.html;
                    break;
                case 'css':
                    editor = editors.css;
                    break;
                case 'js':
                    editor = editors.js;
                    break;
                default:
                    alert('Unsupported file type');
                    return;
            }
            editor.setValue(fileContent);
        };
        reader.readAsText(file);
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
    }
}
}

function formatCode() {
    const editor = editors[currentEditor];
    editor.getAction('editor.action.formatDocument').run();
}

function downloadCode() {
    const htmlCode = editors.html.getValue();
    const cssCode = editors.css.getValue();
    const jsCode = editors.js.getValue();

    const blob = new Blob([htmlCode + '\n' + cssCode + '\n' + jsCode], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'code.txt';
    link.click();
}

// Adding keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        saveCode();
    }
    if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        runCode();
    }
    if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        formatCode();
    }
    if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        toggleFullScreen();
    }
});
