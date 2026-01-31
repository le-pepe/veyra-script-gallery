// ==UserScript==
// @name         Dungeon Loot Button
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Agrega botón de Loot al lado de View con modal de resultados
// @author       LePepe
// @match        https://demonicscans.org/guild_dungeon_location.php*
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Función para obtener USER_ID de múltiples fuentes
    function getUserId() {
        // Intentar desde el botón de Heal
        const healBtn = document.getElementById('healBtn');
        if (healBtn && healBtn.onclick) {
            const onclickStr = healBtn.getAttribute('onclick');
            const match = onclickStr.match(/healDungeonPlayer\(\d+,\s*(\d+)/);
            if (match && match[1]) {
                return match[1];
            }
        }

        // Intentar desde unsafeWindow
        if (unsafeWindow.USER_ID) {
            return unsafeWindow.USER_ID;
        }

        // Intentar desde window global
        if (window.USER_ID) {
            return window.USER_ID;
        }

        // Intentar extraer de algún elemento del DOM
        const userIdElement = document.querySelector('[data-user-id]');
        if (userIdElement) {
            return userIdElement.dataset.userId;
        }

        // Intentar extraer de cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'user_id' || name === 'USER_ID') {
                return value;
            }
        }

        // Intentar extraer de localStorage
        if (localStorage.getItem('USER_ID')) {
            return localStorage.getItem('USER_ID');
        }

        // Intentar extraer desde un script en la página
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            const match = script.textContent.match(/USER_ID\s*=\s*['"]*(\d+)['"]*|var\s+USER_ID\s*=\s*(\d+)|const\s+USER_ID\s*=\s*(\d+)/);
            if (match) {
                return match[1] || match[2] || match[3];
            }
        }

        return null;
    }

    // Crear el modal una sola vez
    function createLootModal() {
        if (document.getElementById('lootModal')) return;

        const modalHTML = `
            <div id="lootModal" style="display: none; position: fixed; top: 0px; left: 0px; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 9999; align-items: center; justify-content: center;">
                <div style="background:#2a2a3d; border-radius:12px; padding:20px; max-width:90%; width:400px; text-align:center; color:white; overflow-y:auto; max-height:80%;">
                    <h2 style="margin-bottom:15px;">🎁 Loot Gained</h2>
                    <div id="lootMessage" style="margin-bottom:15px;"></div>
                    <div id="lootNote" class="muted" style="display:none; margin:-6px 0 10px 0;"></div>
                    <div id="lootItems" style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px;"></div>
                    <br>
                    <button id="closeLootModal" style="margin-top:10px; padding:8px 20px; background:#4a4a6a; color:white; border:none; border-radius:6px; cursor:pointer;">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Evento para cerrar el modal
        document.getElementById('closeLootModal').addEventListener('click', () => {
            document.getElementById('lootModal').style.display = 'none';
        });

        // Cerrar al hacer click fuera del contenido
        document.getElementById('lootModal').addEventListener('click', (e) => {
            if (e.target.id === 'lootModal') {
                document.getElementById('lootModal').style.display = 'none';
            }
        });
    }

    // Mostrar el modal con los items
    function showLootModal(data) {
        const modal = document.getElementById('lootModal');
        const messageDiv = document.getElementById('lootMessage');
        const noteDiv = document.getElementById('lootNote');
        const itemsDiv = document.getElementById('lootItems');

        // Limpiar contenido anterior
        itemsDiv.innerHTML = '';

        // Mostrar mensaje
        messageDiv.innerHTML = data.message;

        // Mostrar nota si existe
        if (data.note) {
            noteDiv.textContent = data.note;
            noteDiv.style.display = 'block';
        } else {
            noteDiv.style.display = 'none';
        }

        // Agregar items
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = 'background: rgb(30, 30, 47); border-radius: 8px; padding: 10px; text-align: center; width: 80px;';

                itemDiv.innerHTML = `
                    <img src="${item.IMAGE_URL}" alt="${item.NAME}" style="width:64px; height:64px;"><br>
                    <small>${item.NAME}</small>
                `;

                itemsDiv.appendChild(itemDiv);
            });
        } else {
            itemsDiv.innerHTML = '<p style="color:#999;">No items received</p>';
        }

        // Mostrar el modal
        modal.style.display = 'flex';
    }

    function addLootButtons() {
        // Buscar todos los componentes de monstruos
        const monsters = document.querySelectorAll('.mon.dead');

        monsters.forEach(monster => {
            // Verificar que tenga las pills "joined" y "not looted"
            const pills = monster.querySelectorAll('.pill');
            let hasJoined = false;
            let hasNotLooted = false;

            pills.forEach(pill => {
                if (pill.textContent.trim() === 'joined') hasJoined = true;
                if (pill.textContent.trim() === 'not looted') hasNotLooted = true;
            });

            // Si cumple las condiciones y no tiene ya el botón
            if (hasJoined && hasNotLooted) {
                const viewButton = monster.querySelector('a.btn[href*="battle.php"]');

                if (viewButton && !monster.querySelector('.loot-btn')) {
                    // Extraer instance_id y dgmid de la URL del botón View
                    const url = new URL(viewButton.href);
                    const instanceId = url.searchParams.get('instance_id');
                    const dgmid = url.searchParams.get('dgmid');

                    // Crear el botón de Loot
                    const lootButton = document.createElement('a');
                    lootButton.className = 'btn loot-btn';
                    lootButton.href = '#';
                    lootButton.textContent = '💰 Loot';
                    lootButton.style.marginLeft = '8px';

                    // Agregar evento click
                    lootButton.addEventListener('click', async (e) => {
                        e.preventDefault();

                        // Obtener user_id con la nueva función
                        const userId = getUserId();

                        if (!userId) {
                            alert('No se pudo obtener USER_ID');
                            console.log('Debug - healBtn:', document.getElementById('healBtn'));
                            return;
                        }

                        console.log('USER_ID encontrado:', userId);

                        try {
                            lootButton.textContent = '⏳ Looting...';
                            lootButton.disabled = true;

                            const response = await fetch("https://demonicscans.org/dungeon_loot.php", {
                                method: "POST",
                                body: `instance_id=${instanceId}&dgmid=${dgmid}&user_id=${userId}`,
                                credentials: "include",
                                headers: {
                                    "Content-Type": "application/x-www-form-urlencoded"
                                }
                            });

                            if (response.ok) {
                                const data = await response.json();

                                if (data.status === 'success') {
                                    lootButton.textContent = '✅ Looted!';
                                    lootButton.style.backgroundColor = '#28a745';

                                    // Remover la pill "not looted"
                                    const notLootedPill = monster.querySelector('.pill.pill-warn');
                                    if (notLootedPill) notLootedPill.remove();

                                    // Mostrar modal con los items
                                    showLootModal(data);
                                } else {
                                    lootButton.textContent = '❌ ' + (data.message || 'Error');
                                    lootButton.style.backgroundColor = '#dc3545';
                                }
                            } else {
                                lootButton.textContent = '❌ Error';
                                lootButton.style.backgroundColor = '#dc3545';
                            }
                        } catch (error) {
                            console.error('Error al hacer loot:', error);
                            lootButton.textContent = '❌ Error';
                            lootButton.style.backgroundColor = '#dc3545';
                        }
                    });

                    // Insertar el botón al lado del botón View
                    viewButton.parentNode.insertBefore(lootButton, viewButton.nextSibling);
                }
            }
        });
    }

    // Crear el modal al cargar
    createLootModal();

    // Ejecutar al cargar la página
    addLootButtons();

    // Observar cambios en el DOM para agregar botones dinámicamente
    const observer = new MutationObserver(addLootButtons);
    observer.observe(document.body, { childList: true, subtree: true });
})();