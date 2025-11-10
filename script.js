// === Seletores ===
const form = document.getElementById('form');
const tabela = document.querySelector('#tabela tbody');
const exportarBtn = document.getElementById('exportar');
const limparBtn = document.getElementById('limpar');
const adicionarNumeracaoBtn = document.getElementById('adicionarNumeracao');
const numeracoesLista = document.getElementById('numeracoes-lista');
const filtroProduto = document.getElementById('filtroProduto');
const filtroCor = document.getElementById('filtroCor');
const inputProduto = document.getElementById('produto');
const inputFabrica = document.getElementById('fabrica');

// Modais e formulário de edição
const modal = document.getElementById('modal-edicao');
const formEdicao = document.getElementById('form-edicao');
const cancelarEdicaoBtn = document.getElementById('cancelarEdicao');
const editProduto = document.getElementById('edit-produto');
const editCor = document.getElementById('edit-cor');
const editNumeracao = document.getElementById('edit-numeracao');
const editQuantidade = document.getElementById('edit-quantidade');

// Modal exclusão
const modalExcluir = document.getElementById('modal-excluir');
const textoExclusao = document.getElementById('texto-exclusao');
const confirmarExclusaoBtn = document.getElementById('confirmarExclusao');
const cancelarExclusaoBtn = document.getElementById('cancelarExclusao');

let registros = JSON.parse(localStorage.getItem('registros')) || [];
let contadorCaixas = parseInt(localStorage.getItem('contadorCaixas')) || 0;
const totalCaixasSpan = document.getElementById('total-caixas');

let mapaFabrica = new Map(); // Produto -> Fábrica (carregada do Excel)
let registroEmEdicao = null;
let registroParaExcluir = null;

// === Utilitários ===
function atualizarContadorCaixas() {
  totalCaixasSpan.textContent = contadorCaixas;
  localStorage.setItem('contadorCaixas', contadorCaixas);
}
function salvarRegistros() {
  localStorage.setItem('registros', JSON.stringify(registros));
}
function formatarNumeracao(valor) {
  valor = valor.toString().trim();
  if (valor.length === 2) return '0' + valor + '0';
  if (valor.length === 3) return '0' + valor;
  if (valor.length === 1) return valor.padStart(4, '0');
  return valor;
}
function gerarItem(produto, cor, numeracao) {
  return `${produto}${cor.toUpperCase()}${numeracao}`;
}

// === Carregar base Excel (arquivo fixo na pasta) ===
async function carregarBaseFabrica() {
  try {
    const resp = await fetch('TODOS OS PROD SEA E SEE.xlsx');
    if (!resp.ok) throw new Error('Não foi possível carregar o arquivo de base.');
    const blob = await resp.blob();
    const data = await blob.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    mapaFabrica.clear();
    json.forEach(row => {
      if (row['Produto'] !== undefined && row['Fábrica'] !== undefined) {
        mapaFabrica.set(String(row['Produto']).trim(), String(row['Fábrica']).trim());
      }
    });

    console.log(`Base carregada: ${mapaFabrica.size} produtos`);
  } catch (err) {
    console.error('Erro ao carregar base de fábrica:', err);
    alert('Erro ao carregar a base de fábricas. Verifique se o arquivo "TODOS OS PROD SEA E SEE.xlsx" está na mesma pasta.');
  }
}

// === Busca automática da fábrica ao digitar produto ===
inputProduto.addEventListener('input', () => {
  const produto = inputProduto.value.trim();
  const fabrica = mapaFabrica.get(produto);
  inputFabrica.value = fabrica || '';
});

// === Renderizar tabela ===
function atualizarTabela() {
  tabela.innerHTML = '';
  const filtroProd = filtroProduto.value.trim().toUpperCase();
  const filtroC = filtroCor.value.trim().toUpperCase();

  const registrosFiltrados = registros.filter(r =>
    (!filtroProd || r.produto.includes(filtroProd)) &&
    (!filtroC || r.cor.includes(filtroC))
  );

  registrosFiltrados.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.produto}</td>
      <td>${item.cor}</td>
      <td>${item.numeracao}</td>
      <td>${item.quantidade}</td>
      <td>${item.item}</td>
      <td>${item.fabrica || ''}</td>
      <td>
        <button type="button" class="btn-editar" data-id="${item.id}">✏️</button>
        <button type="button" class="btn-excluir" data-id="${item.id}">🗑️</button>
      </td>
    `;
    tabela.appendChild(tr);
  });

  tabela.querySelectorAll('.btn-editar').forEach(btn => {
    btn.onclick = () => abrirModalEdicao(btn.dataset.id);
  });
  tabela.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.onclick = () => abrirModalExclusao(btn.dataset.id);
  });

  atualizarContadorCaixas();
}

// === Adicionar numeração ===
adicionarNumeracaoBtn.addEventListener('click', () => {
  const div = document.createElement('div');
  div.className = 'numeracao-linha';
  div.innerHTML = `
    <input type="number" class="numeracao" placeholder="Num" max="999" required />
    <input type="number" class="quantidade" placeholder="Qtd" min="1" required />
    <button type="button" class="remover">❌</button>
  `;
  div.querySelector('.remover').addEventListener('click', () => div.remove());
  numeracoesLista.appendChild(div);
});

// === Adicionar novo registro (salvar) ===
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const produto = inputProduto.value.trim();
  const cor = document.getElementById('cor').value.trim().toUpperCase();
  const fabrica = inputFabrica.value.trim();
  const linhas = document.querySelectorAll('.numeracao-linha');

  if (!produto || !cor || linhas.length === 0) {
    alert('Preencha todos os campos e adicione pelo menos uma numeração.');
    return;
  }

  if (produto.length > 5) return alert('Produto: máximo 5 dígitos.');
  if (isNaN(produto)) return alert('Produto deve conter apenas números.');
  if (cor.length > 5) return alert('Cor: máximo 5 caracteres.');

  linhas.forEach(linha => {
    let numeracao = linha.querySelector('.numeracao').value.trim();
    let quantidade = parseInt(linha.querySelector('.quantidade').value);
    if (!numeracao || quantidade < 1) return;
    numeracao = formatarNumeracao(numeracao);
    const item = gerarItem(produto, cor, numeracao);

    const existente = registros.find(r => r.item === item);
    if (existente) {
      const confirmar = confirm(`O item "${item}" já existe. Deseja somar ${quantidade}?`);
      if (confirmar) existente.quantidade += quantidade;
    } else {
      registros.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2,6),
        produto,
        cor,
        fabrica,
        numeracao,
        item,
        quantidade
      });
    }
  });

  salvarRegistros();
  atualizarTabela();
  form.reset();
  numeracoesLista.innerHTML = '';
  inputFabrica.value = '';
  contadorCaixas++;
  atualizarContadorCaixas();
});

// === Exportar Excel ===
exportarBtn.addEventListener('click', () => {
  if (registros.length === 0) return alert('Nenhum registro para exportar.');
  const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const dados = registros.map(r => ({
    Produto: r.produto,
    Cor: r.cor,
    Numeração: r.numeracao,
    Quantidade: r.quantidade,
    Item: r.item,
    Fábrica: r.fabrica
  }));
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registros');
  XLSX.writeFile(wb, `registros_CO_R_${dataAtual}.xlsx`);
});

// === Limpar todos os registros ===
limparBtn.addEventListener('click', () => {
  if (registros.length === 0) return alert('Nenhum registro para limpar.');
  if (confirm('Tem certeza que deseja apagar todos os registros?')) {
    registros = [];
    localStorage.removeItem('registros');
    contadorCaixas = 0;
    localStorage.setItem('contadorCaixas', contadorCaixas);
    atualizarTabela();
    form.reset();
    numeracoesLista.innerHTML = '';
    inputFabrica.value = '';
    if (modal) modal.style.display = 'none';
    if (modalExcluir) modalExcluir.style.display = 'none';
  }
});

// === Modais: abrir / editar / excluir ===
function abrirModalEdicao(id) {
  const registro = registros.find(r => String(r.id) === String(id));
  if (!registro) return;
  registroEmEdicao = registro;
  editProduto.value = registro.produto;
  editCor.value = registro.cor;
  editNumeracao.value = registro.numeracao.slice(-3);
  editQuantidade.value = registro.quantidade;
  modal.style.display = 'flex';
  editProduto.focus();
}
window.abrirModalEdicao = abrirModalEdicao;

cancelarEdicaoBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  registroEmEdicao = null;
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
    registroEmEdicao = null;
  }
});

formEdicao.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!registroEmEdicao) return;
  const produto = editProduto.value.trim();
  const cor = editCor.value.trim().toUpperCase();
  let numeracao = editNumeracao.value.trim();
  const quantidade = parseInt(editQuantidade.value);

  if (!produto || !cor || !numeracao) return alert('Preencha todos os campos.');
  if (produto.length > 5 || isNaN(produto)) return alert('Produto inválido.');
  if (cor.length > 5) return alert('Cor inválida.');
  if (numeracao.length > 3) return alert('Numeração inválida.');
  if (isNaN(quantidade) || quantidade < 1) return alert('Quantidade inválida.');

  numeracao = formatarNumeracao(numeracao);
  const item = gerarItem(produto, cor, numeracao);

  const duplicado = registros.find(r => r.item === item && r.id !== registroEmEdicao.id);
  if (duplicado) return alert('Já existe um item com esse mesmo código.');

  const fabrica = mapaFabrica.get(produto) || registroEmEdicao.fabrica || '';

  registroEmEdicao.produto = produto;
  registroEmEdicao.cor = cor;
  registroEmEdicao.numeracao = numeracao;
  registroEmEdicao.item = item;
  registroEmEdicao.quantidade = quantidade;
  registroEmEdicao.fabrica = fabrica;

  salvarRegistros();
  atualizarTabela();
  modal.style.display = 'none';
  registroEmEdicao = null;
});

// === Exclusão ===
function abrirModalExclusao(id) {
  const registro = registros.find(r => String(r.id) === String(id));
  if (!registro) return;
  registroParaExcluir = registro;
  textoExclusao.textContent = `Deseja realmente excluir o item "${registro.item}" (${registro.quantidade} unidade${registro.quantidade > 1 ? 's' : ''})?`;
  modalExcluir.style.display = 'flex';
}
window.abrirModalExclusao = abrirModalExclusao;

cancelarExclusaoBtn.addEventListener('click', () => {
  registroParaExcluir = null;
  modalExcluir.style.display = 'none';
});

confirmarExclusaoBtn.addEventListener('click', () => {
  if (!registroParaExcluir) return;
  const idx = registros.findIndex(r => String(r.id) === String(registroParaExcluir.id));
  if (idx !== -1) {
    registros.splice(idx, 1);
    salvarRegistros();
    atualizarTabela();
  }
  registroParaExcluir = null;
  modalExcluir.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modalExcluir) {
    registroParaExcluir = null;
    modalExcluir.style.display = 'none';
  }
});

// === Filtros ===
[filtroProduto, filtroCor].forEach(input => {
  input.addEventListener('input', atualizarTabela);
});

document.querySelectorAll('.limpar-filtro').forEach(botao => {
  botao.addEventListener('click', () => {
    const input = botao.previousElementSibling;
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input')); // Atualiza a tabela após limpar
    }
  });
});

// === Inicialização ===
carregarBaseFabrica().then(() => {
  atualizarTabela();
  atualizarContadorCaixas();
});

