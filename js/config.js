// Configuração Supabase - EDITAR COM SUAS CREDENCIAIS
const SUPABASE_URL = 'https://kswvirdheurkykcqbokv.supabase.co'; // Ex: https://xxxxxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd3ZpcmRoZXVya3lrY3Fib2t2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTIwOCwiZXhwIjoyMDgyNTIxMjA4fQ.5CnziP68971KRQi7_j41oWAJ_asrSBncZiLLcIMxYfk'; // Sua chave anônima

// Classes disponíveis para PT
const CLASSES = [
  { category: 'Tanks', name: 'Off Tank' },
  { category: 'Tanks', name: 'Elevado' },
  { category: 'Tanks', name: 'Silence' },
  { category: 'Healers', name: 'Main Healer' },
  { category: 'Healers', name: 'Raiz Ferrea PT Heal' },
  { category: 'Invisibles', name: 'Oculto' },
  { category: 'Invisibles', name: 'Incubus' },
  { category: 'Suporte', name: 'Quebra Reinos' },
  { category: 'Suporte', name: 'Bruxo Suporte' },
  { category: 'DPS', name: 'Foice' },
  { category: 'DPS', name: 'Fire' },
  { category: 'DPS', name: 'Frost' },
  { category: 'DPS', name: 'Xbow' },
  { category: 'DPS', name: 'Aguia' },
  { category: 'DPS', name: 'Bruxo DPS' },
  { category: 'DPS', name: 'Raiz DPS' }
];

// Função para fazer requisições ao Supabase
async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      // Tentar pegar a mensagem de erro do servidor
      const errorText = await response.text();
      console.error('Resposta do servidor:', errorText);
      throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
    }

    // Para DELETE, a resposta é vazia
    if (method === 'DELETE') {
      return { success: true };
    }

    // Verificar se há conteúdo
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    if (!text) {
      return [];
    }

    // Fazer parse do JSON
    if (contentType && contentType.includes('application/json')) {
      return JSON.parse(text);
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao fazer requisição:', error);
    throw error;
  }
}

// Função para fazer login
async function login(username, password) {
  try {
    const users = await supabaseRequest(`users?username=eq.${username}&select=*`);
    
    if (!users || users.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    const user = users[0];
    
    // Em produção, use hash seguro. Para demo, vamos comparar direto
    if (user.password !== password) {
      throw new Error('Senha incorreta');
    }

    // Salvar sessão
    localStorage.setItem('currentUser', JSON.stringify({
      id: user.id,
      username: user.username
    }));

    return { success: true, user };
  } catch (error) {
    throw error;
  }
}

// Função para fazer logout
function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

// Função para verificar se está logado
function isLoggedIn() {
  return localStorage.getItem('currentUser') !== null;
}

// Função para obter usuário atual
function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

// Função para registrar um jogador (adicionar à PT)
async function registerPlayer(nickname, playerClass, ip) {
  try {
    // Validar IP (deve ser número até 2500)
    const ipNum = parseInt(ip);
    if (isNaN(ipNum) || ipNum < 0 || ipNum > 2500) {
      throw new Error('IP deve ser um número entre 0 e 2500');
    }

    // Validar nickname
    if (!nickname || nickname.trim().length === 0) {
      throw new Error('Nickname não pode estar vazio');
    }

    if (!playerClass || playerClass === '') {
      throw new Error('Classe deve ser selecionada');
    }

    // Verificar se já existe jogador com o mesmo nickname
    const existingPlayers = await supabaseRequest(`players?nickname=eq.${encodeURIComponent(nickname.trim())}&select=id`);
    if (Array.isArray(existingPlayers) && existingPlayers.length > 0) {
      throw new Error(`Esse nick já foi registrado! Outro jogador já está com o nome "${nickname.trim()}"`);
    }

    const result = await supabaseRequest('players', 'POST', {
      nickname: nickname.trim(),
      class: playerClass,
      ip: ipNum,
      registered_at: new Date().toISOString()
    });

    return { success: true, data: result };
  } catch (error) {
    throw error;
  }
}

// Função para obter jogadores agrupados por classe
async function getPlayersByClass() {
  try {
    const players = await supabaseRequest('players?select=*&order=class.asc,ip.desc');
    
    const grouped = {};
    
    CLASSES.forEach(cls => {
      grouped[cls.name] = [];
    });

    if (Array.isArray(players)) {
      players.forEach(player => {
        if (grouped[player.class]) {
          grouped[player.class].push({
            nickname: player.nickname,
            ip: player.ip,
            class: player.class,
            id: player.id
          });
        }
      });
    }

    return grouped;
  } catch (error) {
    console.error('Erro ao obter jogadores:', error);
    throw error;
  }
}

// Função para deletar um jogador (da lista de PT)
async function deletePlayer(playerId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/players?id=eq.${playerId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao deletar:', response.status, errorText);
      throw new Error(`Erro ao deletar jogador: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Erro em deletePlayer:', error);
    throw error;
  }
}
// ===== FUNÇÕES PARA GERENCIAR DG =====

// Obter configuração atual da DG
async function getCurrentDGConfig() {
  try {
    const result = await supabaseRequest('dg_config?select=*&order=selected.desc');
    return Array.isArray(result) && result.length > 0 ? result : null;
  } catch (error) {
    console.error('Erro ao obter configuração da DG:', error);
    throw error;
  }
}

// Obter apenas a DG selecionada
async function getSelectedDG() {
  try {
    const result = await supabaseRequest('dg_config?select=*&selected=eq.true');
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Erro ao obter DG selecionada:', error);
    throw error;
  }
}

// Atualizar DG selecionada e tier
async function updateDGSelection(dgType, tier) {
  try {
    // Primeiro, desselecionar todas (com condição para evitar erro)
    await supabaseRequest('dg_config?selected=eq.true', 'PATCH', {
      selected: false
    });

    // Depois, selecionar a escolhida e atualizar o tier
    const result = await supabaseRequest(
      `dg_config?dg_type=eq.${encodeURIComponent(dgType)}`,
      'PATCH',
      {
        selected: true,
        tier: tier,
        last_updated: new Date().toISOString()
      }
    );

    return { success: true, data: result };
  } catch (error) {
    console.error('Erro ao atualizar DG:', error);
    throw error;
  }
}

// Sistema global de notificações animadas
function showNotification(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notificationContainer');
  
  if (!container) {
    console.warn('Notification container não encontrado');
    return;
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  // Forçar reflow para ativar a animação
  void notification.offsetWidth;

  // Adicionar classe de entrada
  notification.classList.add('notification-show');

  // Remover notificação após o tempo
  setTimeout(() => {
    notification.classList.remove('notification-show');
    notification.classList.add('notification-hide');
    
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
}