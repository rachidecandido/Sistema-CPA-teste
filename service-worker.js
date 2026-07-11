// =====================================
// SERVICE-WORKER.JS - SISTEMA CPA4
// PWA - Cache e funcionamento offline
// =====================================



const CACHE_NAME =

"CPA4-v1";





const ARQUIVOS_CACHE = [



    "./",


    "./index.html",


    "./style.css",


    "./manifest.json",



    "./js/state.js",


    "./js/utils.js",


    "./js/auth.js",


    "./js/firebase.js",


    "./js/nav.js",


    "./js/cpa.js",


    "./js/boletim.js",


    "./js/escola.js",


    "./js/aluno.js"



];









// =====================================
// INSTALAÇÃO
// =====================================



self.addEventListener(

    "install",

    evento=>{



        evento.waitUntil(



            caches.open(

                CACHE_NAME

            )

            .

            then(

                cache=>{



                    return cache.addAll(

                        ARQUIVOS_CACHE

                    );



                }

            )



        );







        self.skipWaiting();



    }

);









// =====================================
// ATIVAÇÃO
// =====================================



self.addEventListener(

    "activate",

    evento=>{



        evento.waitUntil(



            caches.keys()

            .

            then(

                nomes=>{



                    return Promise.all(



                        nomes.map(

                            nome=>{



                                if(

                                    nome !== CACHE_NAME

                                ){



                                    return caches.delete(

                                        nome

                                    );



                                }



                            }

                        )



                    );



                }

            )



        );







        self.clients.claim();



    }

);









// =====================================
// BUSCAR ARQUIVOS
// =====================================



self.addEventListener(

    "fetch",

    evento=>{



        evento.respondWith(



            caches.match(

                evento.request

            )

            .

            then(

                resposta=>{



                    return resposta ||

                    fetch(

                        evento.request

                    )

                    .

                    then(

                        respostaRede=>{



                            return respostaRede;



                        }

                    )



                }

            )



        );



    }

);
