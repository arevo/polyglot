use Dancer;
use MongoDB;

my $client = MongoDB->connect();
my $quotes = $client->get_database('test')->get_collection('quotes');

get '/api/quotes' => sub {
    my $response = $quotes->find()->sort({'index' => -1})->limit(10);
    my @results = ();
    while(my $quote = $response->next) {
                push (@results,
                        {"content" => $quote->{'content'},
                         "index"   => $quote->{'index'},
                         "author"  => $quote->{'author'}
                         }
                );
        } 
        if (! scalar (@results)) {
            status 404;
            return;
        }
        return \@results;
};

post '/api/quotes' => sub {
    my $query = $quotes->find()->sort({'index' => -1})->limit(1);
    my $topquote = $query->next;
    my $max_id = $topquote->{'index'} + 1;
    
    # get the author and content from the parameters
    if (!params->{content}) {
        status 400;
        return {message => "Content is required for new quotes."};
    }

    my %response = (
        'author' => params->{author},
        'content' => params->{content},
        'index' => $max_id
    );

    my $response = $quotes->insert_one(\%response);
    status 201;
    return {"index"=>$max_id};
};

get '/api/quotes/random' => sub {
    my $max_item = $quotes->find()->sort({'index' => -1})->limit(1);
    my $quote = $max_item->next;
    my $max_id = $quote->{'index'};
    my $random = int(rand($max_id));
    my $response = $quotes->find_one({"index" => $random});
    return $response;
};


get '/api/quotes/:index' => sub {
    my $response = $quotes->find_one({"index" => int(params->{'index'})}); 
    if (!$response) {
        status 404;
        return;
    }
    return $response;
};

put '/api/quotes/:index' => sub {
    if (!params->{content} && !params->{author}) {
        status 400;
        return {message => "Content or author is required for updated quotes."};
    }
    my $original = $quotes->find_one({index => int(params->{'index'})}); 
    my $author = $original->{author};
    my $content = $original->{content};
    if (params->{author}) { $author = params->{author}}
    if (params->{content}) { $content = params->{content}}
    
    my $response = $quotes->update_one({'index' => params->{index}}, 
                        {'$set' => {'author'=>$author, 'content'=>$content}});

    status 201;
    return {"index"=>params->{'index'}};
};

del '/api/quotes/:index' => sub {
    my $response = $quotes->delete_one({index => int(params->{'index'})});
    if ($response->deleted_count == 0) {
        status 404;
        return;
    }
    status 204;
    return;
};

get '/' => sub{
    return {message => "Hello from Perl and Dancer"};
};

set public => path(dirname(__FILE__), '..', 'static');

get "/demo/?" => sub {
    send_file '/index.html'
};

dance;

