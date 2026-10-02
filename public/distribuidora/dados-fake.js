(function (root) {
  var NOMES = ['Ana','Beatriz','Bruno','Camila','Carlos','Daniel','Eduarda','Felipe','Fernanda','Gabriel','Gustavo','Helena','Igor','Isabela','João','Juliana','Larissa','Lucas','Mariana','Mateus','Otávio','Patrícia','Pedro','Rafael','Renata','Sofia','Thiago','Vanessa','Vinícius','Yasmin'];
  var SOBRE = ['Almeida','Alves','Araujo','Barbosa','Cardoso','Carvalho','Costa','Ferreira','Gomes','Lima','Martins','Mendes','Moreira','Nascimento','Oliveira','Pereira','Ribeiro','Rocha','Santos','Silva','Souza','Teixeira'];
  var DDD = ['11','21','31','41','43','44','47','48','51','61','62','71','81','85'];

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function slug(s){
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');
  }
  function cpfDv(nums){
    var s=0,i;
    for(i=0;i<nums.length;i++) s+=nums[i]*(nums.length+1-i);
    var d=(s*10)%11;
    return d===10?0:d;
  }
  function gerarCpf(){
    var n=[],i;
    do {
      n=[];
      for(i=0;i<9;i++) n.push(Math.floor(Math.random()*10));
    } while(n.every(function(d){return d===n[0];}));
    n.push(cpfDv(n));
    n.push(cpfDv(n));
    var raw=n.join('');
    return { raw: raw, fmt: raw.slice(0,3)+'.'+raw.slice(3,6)+'.'+raw.slice(6,9)+'-'+raw.slice(9) };
  }
  function gerarPessoa(){
    var nome=pick(NOMES)+' '+pick(SOBRE)+' '+pick(SOBRE);
    while(nome.split(' ')[1]===nome.split(' ')[2]) nome=pick(NOMES)+' '+pick(SOBRE)+' '+pick(SOBRE);
    var cpf=gerarCpf();
    var ddd=pick(DDD);
    var cel='9'+String(Math.floor(10000000+Math.random()*90000000)).slice(0,8);
    var foneRaw=ddd+cel;
    var mail=slug(nome.split(' ')[0])+'.'+slug(nome.split(' ')[1])+Math.floor(10+Math.random()*90)+'@exemplo.com';
    return {
      nome: nome,
      cpf: cpf.fmt,
      cpfRaw: cpf.raw,
      email: mail,
      fone: '('+ddd+') '+cel.slice(0,5)+'-'+cel.slice(5),
      foneRaw: foneRaw
    };
  }
  root.gerarPessoa = gerarPessoa;
})(window);
