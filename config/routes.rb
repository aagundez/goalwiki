Goalwiki::Application.routes.draw do
  match '/list/popular' => redirect('/authentication/signin')
  match '/list/recent' => redirect('/authentication/signin')
  match '/authentication/signin' => redirect('/authentication/signin')
end
